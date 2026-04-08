"""Insert two tutoring sessions for the current week (UTC) between user 1 (tutor) and 2 (student).

Run from backend/:

    python dev/seed_sessions_this_week.py

Safe to run multiple times: refreshes `scheduled_start` / `scheduled_end` for the same
tutor, student, subject, and notes when rows already exist.

Requires rows in `users` with id 1 and 2 (typical after a fresh `seed_test_data.py`: tutor then student).
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from app.database import SessionLocal  # type: ignore  # noqa: E402
from app.models import TutoringSession, User  # type: ignore  # noqa: E402


def _monday_utc(d) -> datetime:
    """Monday 00:00 UTC for the calendar week containing date d."""
    days_since_mon = d.weekday()
    mon = d - timedelta(days=days_since_mon)
    return datetime(mon.year, mon.month, mon.day, tzinfo=timezone.utc)


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
            notes=notes,
        )
        .one_or_none()
    )
    if existing:
        existing.scheduled_start = scheduled_start
        existing.scheduled_end = scheduled_end
        session.flush()
        return existing
    row = TutoringSession(
        tutor_id=tutor_id,
        student_id=student_id,
        subject=subject,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        cost_cents=cost_cents,
        notes=notes,
        status="confirmed",
    )
    session.add(row)
    session.flush()
    return row


def main() -> None:
    tutor_id, student_id = 1, 2
    today = datetime.now(timezone.utc).date()
    week_start = _monday_utc(today)

    with SessionLocal() as session:
        tutor = session.get(User, tutor_id)
        student = session.get(User, student_id)
        if tutor is None or student is None:
            missing = []
            if tutor is None:
                missing.append(f"tutor user id={tutor_id}")
            if student is None:
                missing.append(f"student user id={student_id}")
            raise SystemExit(
                "Missing users: " + ", ".join(missing) + ". Run seed_test_data.py or create those users first."
            )

        # Two one-hour slots this week (UTC): Wed 15:00 and Fri 17:00
        slots = [
            (2, 15, "CS 251 — Wed (seeded)"),
            (4, 17, "CS 251 — Fri (seeded)"),
        ]
        created = []
        for weekday_offset, hour, note_suffix in slots:
            day = week_start + timedelta(days=weekday_offset)
            start = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            end = start + timedelta(hours=1)
            ts = get_or_create_session(
                session,
                tutor_id=tutor_id,
                student_id=student_id,
                subject="CS 251",
                scheduled_start=start,
                scheduled_end=end,
                cost_cents=2500,
                notes=note_suffix,
            )
            created.append(ts)

        session.commit()

    for ts in created:
        print(
            f"Session id={ts.id} tutor_id={tutor_id} student_id={student_id} "
            f"start={ts.scheduled_start.isoformat()} end={ts.scheduled_end.isoformat()}"
        )


if __name__ == "__main__":
    main()
