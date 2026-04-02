"""CRUD queries for tutoring sessions."""

import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password, verify_password
from app.models import TutoringSession


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
