from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import SessionNote, TutoringSession


def get_note_by_session_id(db: Session, *, session_id: int) -> Optional[SessionNote]:
    return db.query(SessionNote).filter(SessionNote.session_id == session_id).first()


def create_note(
    db: Session,
    *,
    session: TutoringSession,
    content: str,
) -> SessionNote:
    note = SessionNote(
        session_id=session.id,
        tutor_id=session.tutor_id,
        student_id=session.student_id,
        content=content,
        subject=session.subject,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note(db: Session, *, note: SessionNote, content: str) -> SessionNote:
    note.content = content
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, *, note: SessionNote) -> None:
    db.delete(note)
    db.commit()


def list_notes_for_tutor(
    db: Session,
    *,
    tutor_id: int,
    student_id: Optional[int] = None,
    subject: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> list[SessionNote]:
    query = (
        db.query(SessionNote)
        .filter(SessionNote.tutor_id == tutor_id)
    )
    if student_id is not None:
        query = query.filter(SessionNote.student_id == student_id)
    if subject is not None:
        query = query.filter(SessionNote.subject == subject)
    if date_from is not None:
        query = query.filter(SessionNote.created_at >= date_from)
    if date_to is not None:
        query = query.filter(SessionNote.created_at <= date_to)
    return query.order_by(SessionNote.created_at.desc()).all()