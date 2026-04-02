"""API routes for TutoringSession (purchases).

- POST   /sessions/              - student purchases/books a session
- GET    /sessions/me            - get current user's sessions (as student or tutor)
- GET    /sessions/{session_id}  - get session details
- PATCH  /sessions/{session_id}  - update session (status, reschedule, notes)
- DELETE /sessions/{session_id}  - cancel/delete a session
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_user
from app.crud.sessions import (
    get_tutor_sessions_future as get_tutor_sessions_future_crud,
    get_tutor_sessions_past as get_tutor_sessions_past_crud,
)
from app.database import get_db
from app.models import User
from app.schemas import TutoringSessionPublic

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
