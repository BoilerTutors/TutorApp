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

from app.auth import get_current_admin, get_current_user
from app.crud.sessions import (
    get_recent_sessions_for_admin as get_recent_sessions_for_admin_crud,
    generate_session_verification_code,
    get_tutor_sessions_future as get_tutor_sessions_future_crud,
    get_tutor_sessions_past as get_tutor_sessions_past_crud,
    get_student_sessions_past as get_student_sessions_past_crud,
    verify_session_verification_code,
)
from app.database import get_db
from app.schemas import AdminTutoringSessionPublic, TutoringSessionPublic
from app.models import TutoringSession, User, Admin
from app.schemas import (
    Message,
    SessionVerificationCodePublic,
    SessionVerificationVerifyRequest,
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
    """Get all future tutoring sessions where the current user is the tutor."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can access tutor sessions.",
        )

    sessions = get_tutor_sessions_future_crud(db, current_user.id)
    return [TutoringSessionPublic.model_validate(s) for s in sessions]


@router.get("/admin/recent", response_model=list[AdminTutoringSessionPublic])
def get_recent_sessions_for_admin(
    tutor_name: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[AdminTutoringSessionPublic]:
    """Get the most recently created tutoring sessions for admins."""
    _ = current_admin
    safe_limit = max(1, min(limit, 100))
    sessions = get_recent_sessions_for_admin_crud(db, limit=safe_limit, tutor_name=tutor_name)
    return [AdminTutoringSessionPublic.model_validate(session) for session in sessions]
  
  
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

@router.get("/student/past", response_model=list[TutoringSessionPublic])
def get_student_sessions_past(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TutoringSessionPublic]:
    """Get all past tutoring sessions where the current user is the student."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student sessions.",
        )
    sessions = get_student_sessions_past_crud(db, current_user.id)
    return [TutoringSessionPublic.model_validate(s) for s in sessions]
