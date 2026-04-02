"""API routes for TutoringSession (purchases).

- POST   /sessions/              - student purchases/books a session
- GET    /sessions/me            - get current user's sessions (as student or tutor)
- GET    /sessions/{session_id}  - get session details
- POST   /sessions/{session_id}/verification-code - student gets attendance PIN for session
- POST   /sessions/{session_id}/verify-code - tutor verifies the student's attendance PIN
- PATCH  /sessions/{session_id}  - update session (status, reschedule, notes)
- DELETE /sessions/{session_id}  - cancel/delete a session
"""
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import get_current_admin, get_current_user, get_user_from_token
from app.crud.sessions import (
    create_tutoring_session,
    get_recent_sessions_for_admin as get_recent_sessions_for_admin_crud,
    generate_session_verification_code,
    get_session_for_tutor,
    get_student_sessions_future as get_student_sessions_future_crud,
    get_tutor_sessions_future as get_tutor_sessions_future_crud,
    get_tutor_sessions_past as get_tutor_sessions_past_crud,
    get_student_sessions_past as get_student_sessions_past_crud,
    set_session_status,
    get_current_session_for_user,
    verify_session_verification_code,
)
from app.database import get_db
from app.services.session_verification_ws import session_verification_ws_manager
from app.schemas import AdminTutoringSessionPublic, TutoringSessionPublic
from app.models import TutoringSession, User, Admin
from app.schemas import (
    CurrentSessionExistsPublic,
    Message,
    SessionVerificationCodePublic,
    SessionVerificationVerifyRequest,
    TutoringSessionCreate,
    TutoringSessionUpdate,
    TutoringSessionPublic,

)

router = APIRouter()


@router.websocket("/ws/verification")
async def session_verification_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> None:
    """Realtime session verification status updates for the authenticated user."""
    user = get_user_from_token(token, db)
    await session_verification_ws_manager.connect(websocket, user.id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        session_verification_ws_manager.disconnect(websocket, user.id)


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
        s for s in get_tutor_sessions_future_crud(db, current_user.id)
        if s.status != "cancelled"
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
        s for s in get_student_sessions_future_crud(db, current_user.id)
        if s.status != "cancelled"
    ]
    return [TutoringSessionPublic.model_validate(s) for s in sessions]


@router.get(
    "/current/exists",
    response_model=CurrentSessionExistsPublic,
    response_model_exclude_none=True,
)
def get_current_user_has_current_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentSessionExistsPublic:
    """Return whether the authenticated user is in an active tutoring session now."""
    session = get_current_session_for_user(db, current_user.id)
    if session is None:
        return CurrentSessionExistsPublic(has_current_session=False)

    other_user_id = (
        session.student_id if session.tutor_id == current_user.id else session.tutor_id
    )
    return CurrentSessionExistsPublic(
        has_current_session=True,
        session_id=session.id,
        other_user_id=other_user_id,
        is_verified=session.is_verified,
    )



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
async def verify_session_code(
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

    payload = {
        "event_type": "session_verification_updated",
        "session_id": session_id,
        "is_verified": True,
    }
    await session_verification_ws_manager.send_to_user(session.student_id, payload)
    await session_verification_ws_manager.send_to_user(session.tutor_id, payload)
    return Message(message="Verification code accepted")


@router.patch("/{session_id}", response_model=TutoringSessionPublic)
def update_session(
    session_id: int,
    data: TutoringSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TutoringSessionPublic:
    """Update an existing tutoring session (currently used for tutor cancellation)."""
    if not current_user.is_tutor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can update sessions.",
        )
    session = get_session_for_tutor(db, session_id=session_id, tutor_user_id=current_user.id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found for this tutor.",
        )
    if data.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No session update fields provided.",
        )
    if data.status != "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only cancellation is supported from this endpoint.",
        )
    row = set_session_status(db, session=session, status="cancelled")
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
