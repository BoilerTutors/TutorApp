"""Seed the local database with one student and two tutors.

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
            notes=notes,
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

        # Tutor A: paired with the student, has a current session.
        tutor_user_a = get_or_create_user(
            session,
            email="tutor1@example.com",
            first_name="TutorA",
            last_name="Tutor",
            hashed_password=dummy_hashed,
            mfa_enabled=False,
            mfa_code=None,
            mfa_expires_at=None,
            mfa_code_attempts=0,
            is_tutor=True,
            is_student=False,
        )

        if tutor_user_a.tutor is None:
            tutor_profile = TutorProfile(
                user_id=tutor_user_a.id,
                bio="Local dev tutor account (current-session tutor)",
                hourly_rate_cents=2500,
                major="CS",
                grad_year=2026,
            )
            session.add(tutor_profile)

        # Student: paired with both tutors.
        student_user = get_or_create_user(
            session,
            email="student@example.com",
            first_name="Primary",
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

        # Tutor B: paired with the student, has an upcoming session.
        tutor_user_b = get_or_create_user(
            session,
            email="tutor2@example.com",
            first_name="TutorB",
            last_name="Tutor",
            hashed_password=dummy_hashed,
            mfa_enabled=False,
            mfa_code=None,
            mfa_expires_at=None,
            mfa_code_attempts=0,
            is_tutor=True,
            is_student=False,
        )

        if tutor_user_b.tutor is None:
            tutor_profile = TutorProfile(
                user_id=tutor_user_b.id,
                bio="Local dev tutor account (upcoming-session tutor)",
                hourly_rate_cents=3000,
                major="MATH",
                grad_year=2026,
            )
            session.add(tutor_profile)

        # Current session for Tutor A <-> Student.
        now = datetime.now(timezone.utc)
        current_start = now - timedelta(minutes=10)
        current_end = now + timedelta(minutes=10)
        current_session = get_or_create_session(
            session,
            tutor_id=tutor_user_a.id,
            student_id=student_user.id,
            subject="CS 251",
            scheduled_start=current_start,
            scheduled_end=current_end,
            cost_cents=2500,
            notes="Seeded current tutoring session",
        )

        # Upcoming session for Tutor B <-> Student.
        upcoming_start = now + timedelta(days=1)
        upcoming_end = upcoming_start + timedelta(minutes=30)
        upcoming_session = get_or_create_session(
            session,
            tutor_id=tutor_user_b.id,
            student_id=student_user.id,
            subject="MATH 261",
            scheduled_start=upcoming_start,
            scheduled_end=upcoming_end,
            cost_cents=3000,
            notes="Seeded upcoming tutoring session",
        )

        session.commit()

    print("Seeded local DB with:")
    print(f"  Tutor A  -> id={tutor_user_a.id}, email=tutor1@example.com, password={plain_password!r}")
    print(f"  Tutor B  -> id={tutor_user_b.id}, email=tutor2@example.com, password={plain_password!r}")
    print(f"  Student  -> id={student_user.id}, email=student@example.com, password={plain_password!r}")
    print(
        f"  Current Session  -> id={current_session.id}, tutor_id={tutor_user_a.id}, student_id={student_user.id}, subject='CS 251'"
    )
    print(
        f"  Upcoming Session -> id={upcoming_session.id}, tutor_id={tutor_user_b.id}, student_id={student_user.id}, subject='MATH 261'"
    )


if __name__ == "__main__":
    main()

