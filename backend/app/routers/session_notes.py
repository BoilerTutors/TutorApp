"""API routes for SessionNote (tutor session notes).

- POST   /session-notes/{session_id}       - tutor creates note for completed session
- PUT    /session-notes/{session_id}       - tutor edits note
- DELETE /session-notes/{session_id}       - tutor deletes note
- GET    /session-notes/{session_id}       - tutor or student in session reads note
- GET    /session-notes/tutor/me           - tutor's notes overview with filters
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.crud.session_notes import (
    create_note,
    delete_note,
    get_note_by_session_id,
    list_notes_for_tutor,
    update_note,
)
from app.database import get_db
from app.models import TutoringSession, User
from app.schemas import (
    SessionNoteCreate,
    SessionNotePublic,
    SessionNoteUpdate,
)
from app.services.notification_events import build_and_store_notification

router = APIRouter()


def _get_session_or_404(db: Session, session_id: int) -> TutoringSession:
    session = db.get(TutoringSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    return session


def _require_completed(session: TutoringSession) -> None:
    if session.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notes can only be managed for completed sessions.",
        )


@router.get("/tutor/me", response_model=list[SessionNotePublic])
def list_my_notes(
    student_id: Optional[int] = Query(None),
    subject: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SessionNotePublic]:
    """Tutor's notes overview, with optional filters by student, subject, and date range."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view their notes overview.",
        )
    return list_notes_for_tutor(
        db,
        tutor_id=current_user.id,
        student_id=student_id,
        subject=subject,
        date_from=date_from,
        date_to=date_to,
    )


@router.post(
    "/{session_id}",
    response_model=SessionNotePublic,
    status_code=status.HTTP_201_CREATED,
)
def create_session_note(
    session_id: int,
    data: SessionNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionNotePublic:
    """Tutor creates a note for a completed session."""
    session = _get_session_or_404(db, session_id)
    if session.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session's tutor can create notes.",
        )
    _require_completed(session)
    if not data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty.",
        )
    if get_note_by_session_id(db, session_id=session_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A note already exists for this session.",
        )
    note = create_note(db, session=session, content=data.content)
    build_and_store_notification(
        db,
        user_id=session.student_id,
        event_type="session_notes_added",
        title="Session notes available",
        body=f"Your tutor added notes for your {session.subject} session.",
        payload_json={
            "session_id": session.id,
            "tutor_id": session.tutor_id,
            "student_id": session.student_id,
        },
    )
    return note


@router.put("/{session_id}", response_model=SessionNotePublic)
def update_session_note(
    session_id: int,
    data: SessionNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionNotePublic:
    """Tutor edits an existing note."""
    session = _get_session_or_404(db, session_id)
    if session.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session's tutor can edit notes.",
        )
    _require_completed(session)
    if not data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty.",
        )
    note = get_note_by_session_id(db, session_id=session_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found for this session.",
        )
    return update_note(db, note=note, content=data.content)


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_session_note(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Tutor deletes their note."""
    session = _get_session_or_404(db, session_id)
    if session.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session's tutor can delete notes.",
        )
    _require_completed(session)
    note = get_note_by_session_id(db, session_id=session_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found for this session.",
        )
    delete_note(db, note=note)


@router.get("/{session_id}", response_model=Optional[SessionNotePublic])
def get_session_note(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Optional[SessionNotePublic]:
    """Tutor or student in session reads the note. Returns null if no note exists."""
    session = _get_session_or_404(db, session_id)
    if current_user.id not in (session.tutor_id, session.student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )
    return get_note_by_session_id(db, session_id=session_id)