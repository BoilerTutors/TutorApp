"""CRUD queries for tutoring sessions."""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password, verify_password
from app.models import TutoringSession, TutorProfile


def utc_week_start_end(now: datetime | None = None) -> tuple[datetime, datetime]:
    """Monday 00:00 UTC through Sunday 23:59:59.999 UTC for the week containing `now` (UTC)."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    midnight = now.astimezone(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    delta_days = midnight.weekday()
    start = midnight - timedelta(days=delta_days)
    end = start + timedelta(days=7) - timedelta(microseconds=1)
    return start, end


def count_tutor_sessions_in_utc_week(
    db: Session, tutor_user_id: int, now: datetime | None = None
) -> int:
    """Non-cancelled sessions whose scheduled_start falls in the current UTC week."""
    start, end = utc_week_start_end(now)
    n = (
        db.query(func.count(TutoringSession.id))
        .filter(
            TutoringSession.tutor_id == tutor_user_id,
            TutoringSession.status != "cancelled",
            TutoringSession.scheduled_start >= start,
            TutoringSession.scheduled_start <= end,
        )
        .scalar()
    )
    return int(n or 0)


def tutor_weekly_cap_reached(db: Session, tutor_user_id: int) -> bool:
    """True when the tutor has a weekly cap and scheduled sessions this UTC week meet or exceed it."""
    tutor = (
        db.query(TutorProfile)
        .filter(TutorProfile.user_id == tutor_user_id)
        .first()
    )
    if tutor is None or tutor.max_sessions_per_week is None:
        return False
    cap = tutor.max_sessions_per_week
    if cap < 1:
        return False
    used = count_tutor_sessions_in_utc_week(db, tutor_user_id)
    return used >= cap


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
    """Return sessions not yet ended (includes in-progress), soonest first."""
    now = datetime.now(timezone.utc)
    return (
        db.query(TutoringSession)
        .filter(TutoringSession.tutor_id == tutor_user_id)
        .filter(TutoringSession.scheduled_end >= now)
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
