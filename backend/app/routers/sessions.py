"""API routes for TutoringSession (purchases).

- POST   /sessions/              - student purchases/books a session
- GET    /sessions/me            - get current user's sessions (as student or tutor)
- GET    /sessions/{session_id}  - get session details
- POST   /sessions/{session_id}/verification-code - student gets attendance PIN for session
- POST   /sessions/{session_id}/verify-code - tutor verifies the student's attendance PIN
- PATCH  /sessions/{session_id}  - update session (status, reschedule, notes)
- DELETE /sessions/{session_id}  - cancel/delete a session
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.sessions import (
    generate_session_verification_code,
    get_tutor_sessions_future as get_tutor_sessions_future_crud,
    get_tutor_sessions_past as get_tutor_sessions_past_crud,
    verify_session_verification_code,
)
from app.database import get_db
from app.models import TutoringSession, User
from app.schemas import (
    Message,
    SessionVerificationCodePublic,
    SessionVerificationVerifyRequest,
    TutoringSessionPublic,
)

router = APIRouter()


@router.get("/tutor/past", response_model=list[TutoringSessionPublic])
def get_tutor_sessions_past(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TutoringSessionPublic]:
    """Get all past tutoring sessions where the current user is the tutor."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can access tutor sessions.",
        )

    sessions = get_tutor_sessions_past_crud(db, current_user.id)
    return [TutoringSessionPublic.model_validate(s) for s in sessions]


@router.get("/tutor/future", response_model=list[TutoringSessionPublic])
def get_tutor_sessions_future(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TutoringSessionPublic]:
    """Get tutoring sessions that have not ended yet (current user is tutor)."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can access tutor sessions.",
        )

    sessions = get_tutor_sessions_future_crud(db, current_user.id)
    return [TutoringSessionPublic.model_validate(s) for s in sessions]


@router.post(
    "/{session_id}/verification-code",
    response_model=SessionVerificationCodePublic,
)
def create_session_verification_code(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionVerificationCodePublic:
    """Generate and return a verification PIN for the student in this session."""
    session = db.get(TutoringSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the student in this session can generate a verification code.",
        )

    code = generate_session_verification_code(db, session_id)
    return SessionVerificationCodePublic(verification_code=code)


@router.post("/{session_id}/verify-code", response_model=Message)
def verify_session_code(
    session_id: int,
    data: SessionVerificationVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    """Verify the student's PIN for this session (tutor-only)."""
    session = db.get(TutoringSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the tutor in this session can verify the code.",
        )

    try:
        is_valid = verify_session_verification_code(db, session_id, data.pin)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    return Message(message="Verification code accepted")
