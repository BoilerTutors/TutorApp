"""Seed the local database with a test tutor and student.

Run from backend/:

    python dev/seed_test_data.py
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

# Ensure backend/ is on sys.path
backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from app.database import SessionLocal  # type: ignore  # noqa: E402
from app.models import User, TutorProfile, StudentProfile, TutoringSession  # type: ignore  # noqa: E402
from app.auth import hash_password  # type: ignore  # noqa: E402


def get_or_create_user(session, email: str, **kwargs) -> User:
    user = session.query(User).filter_by(email=email).one_or_none()
    if user:
        return user
    user = User(
        email=email,
        created_at=datetime.utcnow(),
        **kwargs,
    )
    session.add(user)
    session.flush()  # assign id
    return user


def get_or_create_session(
    session,
    *,
    tutor_id: int,
    student_id: int,
    subject: str,
    scheduled_start: datetime,
    scheduled_end: datetime,
    cost_cents: int,
    notes: str,
) -> TutoringSession:
    existing = (
        session.query(TutoringSession)
        .filter_by(
            tutor_id=tutor_id,
            student_id=student_id,
            subject=subject,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
        )
        .one_or_none()
    )
    if existing:
        return existing

    tutoring_session = TutoringSession(
        tutor_id=tutor_id,
        student_id=student_id,
        subject=subject,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        cost_cents=cost_cents,
        notes=notes,
        status="confirmed",
    )
    session.add(tutoring_session)
    session.flush()  # assign id
    return tutoring_session


def main() -> None:
    with SessionLocal() as session:
        # Local dev password (works with /auth/login)
        plain_password = "Password123!"
        dummy_hashed = hash_password(plain_password)

        # Tutor account
        tutor_user = get_or_create_user(
            session,
            email="tutor@example.com",
            first_name="Test",
            last_name="Tutor",
            hashed_password=dummy_hashed,
            mfa_enabled=False,
            mfa_code=None,
            mfa_expires_at=None,
            mfa_code_attempts=0,
            is_tutor=True,
            is_student=False,
        )

        if tutor_user.tutor is None:
            tutor_profile = TutorProfile(
                user_id=tutor_user.id,
                bio="Local dev tutor account",
                hourly_rate_cents=2500,
                major="CS",
                grad_year=2026,
            )
            session.add(tutor_profile)

        # Student account
        student_user = get_or_create_user(
            session,
            email="student@example.com",
            first_name="Test",
            last_name="Student",
            hashed_password=dummy_hashed,
            mfa_enabled=False,
            mfa_code=None,
            mfa_expires_at=None,
            mfa_code_attempts=0,
            is_tutor=False,
            is_student=True,
        )

        if student_user.student is None:
            student_profile = StudentProfile(
                user_id=student_user.id,
                major="CS",
                grad_year=2027,
            )
            session.add(student_profile)

        # Admin account (no tutor/student profile)
        admin_user = get_or_create_user(
            session,
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            hashed_password=dummy_hashed,
            mfa_enabled=False,
            mfa_code=None,
            mfa_expires_at=None,
            mfa_code_attempts=0,
            is_tutor=False,
            is_student=False,
        )

        # Example session between seeded student and tutor users
        start = datetime(2026, 4, 15, 15, 0, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        example_session = get_or_create_session(
            session,
            tutor_id=tutor_user.id,
            student_id=student_user.id,
            subject="CS 251",
            scheduled_start=start,
            scheduled_end=end,
            cost_cents=2500,
            notes="Seeded example tutoring session",
        )

        session.commit()

    print("Seeded local DB with:")
    print(f"  Tutor   -> id={tutor_user.id}, email=tutor@example.com, password={plain_password!r}")
    print(f"  Student -> id={student_user.id}, email=student@example.com, password={plain_password!r}")
    print(f"  Admin   -> id={admin_user.id}, email=admin@example.com, password={plain_password!r}")
    print(
        f"  Session -> id={example_session.id}, tutor_id={tutor_user.id}, student_id={student_user.id}, subject='CS 251'"
    )


if __name__ == "__main__":
    main()

