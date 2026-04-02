"""CRUD queries for tutoring sessions."""

import secrets
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased  # type: ignore[import]

from app.models import TutoringSession, User
from app.auth import hash_password, verify_password


def get_tutor_sessions_past(db: Session, tutor_user_id: int) -> list[TutoringSession]:
    """Return completed-history style sessions for a tutor (most recent first)."""
    now = datetime.now(timezone.utc)
    return (
        db.query(TutoringSession)
        .filter(TutoringSession.tutor_id == tutor_user_id)
        .filter(TutoringSession.scheduled_end < now)
        .order_by(TutoringSession.scheduled_start.desc())
        .all()
    )


def get_tutor_sessions_future(db: Session, tutor_user_id: int) -> list[TutoringSession]:
    """Return upcoming sessions for a tutor (soonest first)."""
    now = datetime.now(timezone.utc)
    return (
        db.query(TutoringSession)
        .filter(TutoringSession.tutor_id == tutor_user_id)
        .filter(TutoringSession.scheduled_start >= now)
        .order_by(TutoringSession.scheduled_start.asc())
        .all()
    )


def get_recent_sessions_for_admin(
    db: Session,
    limit: int = 50,
    tutor_name: str | None = None,
) -> list[dict]:
    tutor = aliased(User)
    student = aliased(User)

    stmt = (
        db.query(
            TutoringSession.id,
            TutoringSession.tutor_id,
            TutoringSession.student_id,
            TutoringSession.subject,
            TutoringSession.scheduled_start,
            TutoringSession.scheduled_end,
            TutoringSession.cost_cents,
            TutoringSession.notes,
            TutoringSession.status,
            TutoringSession.purchased_at,
            tutor.first_name.label("tutor_first_name"),
            tutor.last_name.label("tutor_last_name"),
            student.first_name.label("student_first_name"),
            student.last_name.label("student_last_name"),
        )
        .join(tutor, TutoringSession.tutor_id == tutor.id)
        .join(student, TutoringSession.student_id == student.id)
    )

    if tutor_name:
        search = f"%{tutor_name.strip()}%"
        stmt = stmt.filter(
            or_(
                tutor.first_name.ilike(search),
                tutor.last_name.ilike(search),
                (tutor.first_name + " " + tutor.last_name).ilike(search),
            )
        )

    rows = stmt.order_by(TutoringSession.id.desc()).limit(limit).all()

    return [
        {
            "id": row.id,
            "tutor_id": row.tutor_id,
            "student_id": row.student_id,
            "tutor_name": f"{row.tutor_first_name} {row.tutor_last_name}".strip(),
            "student_name": f"{row.student_first_name} {row.student_last_name}".strip(),
            "subject": row.subject,
            "scheduled_start": row.scheduled_start,
            "scheduled_end": row.scheduled_end,
            "cost_cents": row.cost_cents,
            "notes": row.notes,
            "status": row.status,
            "purchased_at": row.purchased_at,
        }
        for row in rows
    ]
  
def generate_session_verification_code(db: Session, session_id: int) -> str:
    """Generate a 6-digit PIN, store its hash on a session, and return the PIN."""
    session = db.get(TutoringSession, session_id)
    if session is None:
        raise ValueError("Session not found")

    code = f"{secrets.randbelow(1_000_000):06d}"
    session.verification_code_hash = hash_password(code)
    db.commit()
    return code


def verify_session_verification_code(db: Session, session_id: int, pin: str) -> bool:
    """Return True when a provided 6-digit PIN matches the stored session PIN hash."""
    session = db.get(TutoringSession, session_id)
    if session is None:
        raise ValueError("Session not found")
    if not session.verification_code_hash:
        raise ValueError("No verification code has been generated for this session")

    is_valid = verify_password(pin, session.verification_code_hash)
    if is_valid:
        session.is_verified = True
        db.commit()
    return is_valid


def get_student_sessions_past(db: Session, student_user_id: int) -> list[TutoringSession]:
    """Return past sessions for a student (most recent first)."""
    now = datetime.now(timezone.utc)
    return (
        db.query(TutoringSession)
        .filter(TutoringSession.student_id == student_user_id)
        .filter(TutoringSession.scheduled_end < now)
        .order_by(TutoringSession.scheduled_start.desc())
        .all()
    )


def get_student_sessions_future(db: Session, student_user_id: int) -> list[TutoringSession]:
    """Return upcoming sessions for a student (soonest first)."""
    now = datetime.now(timezone.utc)
    return (
        db.query(TutoringSession)
        .filter(TutoringSession.student_id == student_user_id)
        .filter(TutoringSession.scheduled_start >= now)
        .order_by(TutoringSession.scheduled_start.asc())
        .all()
    )


def create_tutoring_session(
    db: Session,
    *,
    tutor_id: int,
    student_id: int,
    subject: str,
    scheduled_start: datetime,
    scheduled_end: datetime,
    cost_cents: int,
    notes: str | None = None,
) -> TutoringSession:
    row = TutoringSession(
        tutor_id=tutor_id,
        student_id=student_id,
        subject=subject,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        cost_cents=cost_cents,
        notes=notes,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_session_for_tutor(db: Session, *, session_id: int, tutor_user_id: int) -> TutoringSession | None:
    return (
        db.query(TutoringSession)
        .filter(
            TutoringSession.id == session_id,
            TutoringSession.tutor_id == tutor_user_id,
        )
        .first()
    )


def set_session_status(
    db: Session,
    *,
    session: TutoringSession,
    status: str,
) -> TutoringSession:
    session.status = status
    db.commit()
    db.refresh(session)
    return session
