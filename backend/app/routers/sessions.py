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
    create_tutoring_session,
    get_recent_sessions_for_admin as get_recent_sessions_for_admin_crud,
    generate_session_verification_code,
    get_session_for_student,
    get_session_for_tutor,
    get_student_sessions_future as get_student_sessions_future_crud,
    get_tutor_sessions_future as get_tutor_sessions_future_crud,
    get_tutor_sessions_past as get_tutor_sessions_past_crud,
    get_student_sessions_past as get_student_sessions_past_crud,
    set_session_status,
    verify_session_verification_code,
)
from app.database import get_db
from app.schemas import AdminTutoringSessionPublic, TutoringSessionPublic
from app.models import TutoringSession, User, Admin
from app.services.notification_events import build_and_store_notification
from app.schemas import (
    Message,
    SessionVerificationCodePublic,
    SessionVerificationVerifyRequest,
    TutoringSessionCreate,
    TutoringSessionUpdate,
    TutoringSessionPublic,

)

router = APIRouter()


@router.post("/", response_model=TutoringSessionPublic, status_code=status.HTTP_201_CREATED)
def create_session(
    data: TutoringSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TutoringSessionPublic:
    """Create a tutoring session purchase/booking as a student."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create sessions.",
        )
    if data.tutor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot create a session with yourself.",
        )
    tutor = db.get(User, data.tutor_id)
    if tutor is None or not tutor.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found.",
        )
    if data.scheduled_end <= data.scheduled_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scheduled_end must be after scheduled_start.",
        )
    row = create_tutoring_session(
        db,
        tutor_id=data.tutor_id,
        student_id=current_user.id,
        subject=data.subject,
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        cost_cents=data.cost_cents,
        notes=data.notes,
    )
    build_and_store_notification(
        db,
        user_id=tutor.id,
        event_type="session_request",
        title="New session request",
        body=f"{current_user.first_name} requested a tutoring session for {data.subject}.",
        payload_json={
            "session_id": row.id,
            "student_id": current_user.id,
            "tutor_id": tutor.id,
            "subject": data.subject,
            "status": row.status,
        },
    )
    return TutoringSessionPublic.model_validate(row)


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

    sessions = [
        s
        for s in get_tutor_sessions_future_crud(db, current_user.id)
        if s.status in ("pending", "accepted")
    ]
    return [TutoringSessionPublic.model_validate(s) for s in sessions]



@router.get("/student/future", response_model=list[TutoringSessionPublic])
def get_student_sessions_future(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TutoringSessionPublic]:
    """Get all future tutoring sessions where the current user is the student."""
    if not current_user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student sessions.",
        )
    sessions = [
        s
        for s in get_student_sessions_future_crud(db, current_user.id)
        if s.status in ("pending", "accepted")
    ]
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


@router.patch("/{session_id}", response_model=TutoringSessionPublic)
def update_session(
    session_id: int,
    data: TutoringSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TutoringSessionPublic:
    """Update an existing tutoring session."""
    is_tutor_owner = False
    if current_user.is_tutor:
        session = get_session_for_tutor(db, session_id=session_id, tutor_user_id=current_user.id)
        is_tutor_owner = session is not None
    else:
        session = None

    is_student_owner = False
    if session is None and current_user.is_student:
        session = get_session_for_student(db, session_id=session_id, student_user_id=current_user.id)
        is_student_owner = session is not None

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found for this user.",
        )
    if data.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No session update fields provided.",
        )
    if is_student_owner:
        if data.status != "cancelled":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only cancel sessions.",
            )
        if session.status in {"declined", "cancelled"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session has already been declined/cancelled.",
            )
        row = set_session_status(db, session=session, status="cancelled")
        return TutoringSessionPublic.model_validate(row)

    if not is_tutor_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session's tutor or student can update this session.",
        )

    if data.status not in {"accepted", "declined", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only accepted, declined, or cancelled are supported.",
        )
    if data.status in {"accepted", "declined"} and session.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending sessions can be accepted or declined.",
        )
    if data.status == "cancelled" and session.status in {"declined", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has already been declined/cancelled.",
        )

    row = set_session_status(db, session=session, status=data.status)
    if data.status in {"accepted", "declined"}:
        build_and_store_notification(
            db,
            user_id=session.student_id,
            event_type="session_status",
            title="Session request updated",
            body=f"Your tutor has {data.status} your session for {session.subject}.",
            payload_json={
                "session_id": session.id,
                "student_id": session.student_id,
                "tutor_id": session.tutor_id,
                "subject": session.subject,
                "status": data.status,
            },
        )
    return TutoringSessionPublic.model_validate(row)

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
