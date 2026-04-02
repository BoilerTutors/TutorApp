"""Unit tests for app.crud.sessions (real DB, frozen time for past/future boundaries)."""

from datetime import datetime, timedelta, timezone

from app.crud.sessions import get_tutor_sessions_future, get_tutor_sessions_past
from app.crud.users import create_user
from app.models import TutoringSession
from app.schemas import UserCreate

FIXED_NOW = datetime(2025, 6, 15, 12, 0, 0, tzinfo=timezone.utc)


class _FrozenDatetime:
    """Stand-in for `datetime` in app.crud.sessions with a fixed `now`."""

    @staticmethod
    def now(tz=None):
        return FIXED_NOW


def _create_users(db_session):
    tutor = create_user(
        db_session,
        UserCreate(
            email="tutor_unit@purdue.edu",
            first_name="T",
            last_name="Tutor",
            password="password123",
            is_tutor=True,
            is_student=False,
        ),
    )
    student = create_user(
        db_session,
        UserCreate(
            email="student_unit@purdue.edu",
            first_name="S",
            last_name="Student",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    other_tutor = create_user(
        db_session,
        UserCreate(
            email="other_tutor@purdue.edu",
            first_name="O",
            last_name="Other",
            password="password123",
            is_tutor=True,
            is_student=False,
        ),
    )
    db_session.commit()
    return tutor, student, other_tutor


def _add_session(
    db_session,
    *,
    tutor_id: int,
    student_id: int,
    start: datetime,
    end: datetime,
    status: str = "confirmed",
) -> TutoringSession:
    s = TutoringSession(
        tutor_id=tutor_id,
        student_id=student_id,
        scheduled_start=start,
        scheduled_end=end,
        subject="CS 180",
        cost_cents=5000,
        status=status,
    )
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def test_get_tutor_sessions_past_empty_when_none(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, _, _ = _create_users(db_session)
    assert get_tutor_sessions_past(db_session, tutor.id) == []


def test_get_tutor_sessions_past_excludes_future_and_other_tutor(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, student, other_tutor = _create_users(db_session)

    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW - timedelta(hours=3),
        end=FIXED_NOW - timedelta(hours=2),
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW - timedelta(days=1),
        end=FIXED_NOW - timedelta(hours=20),
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW + timedelta(hours=1),
        end=FIXED_NOW + timedelta(hours=2),
    )
    _add_session(
        db_session,
        tutor_id=other_tutor.id,
        student_id=student.id,
        start=FIXED_NOW - timedelta(hours=5),
        end=FIXED_NOW - timedelta(hours=4),
    )

    rows = get_tutor_sessions_past(db_session, tutor.id)
    assert len(rows) == 2
    assert rows[0].scheduled_start > rows[1].scheduled_start


def test_get_tutor_sessions_future_empty_when_none(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, _, _ = _create_users(db_session)
    assert get_tutor_sessions_future(db_session, tutor.id) == []


def test_get_tutor_sessions_future_excludes_past_and_orders_asc(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, student, other_tutor = _create_users(db_session)

    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW - timedelta(hours=2),
        end=FIXED_NOW - timedelta(hours=1),
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW + timedelta(days=2),
        end=FIXED_NOW + timedelta(days=2, hours=1),
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW + timedelta(hours=1),
        end=FIXED_NOW + timedelta(hours=2),
    )
    _add_session(
        db_session,
        tutor_id=other_tutor.id,
        student_id=student.id,
        start=FIXED_NOW + timedelta(hours=3),
        end=FIXED_NOW + timedelta(hours=4),
    )

    rows = get_tutor_sessions_future(db_session, tutor.id)
    assert len(rows) == 2
    assert rows[0].scheduled_start < rows[1].scheduled_start


def test_get_tutor_sessions_future_includes_start_at_now(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, student, _ = _create_users(db_session)
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW,
        end=FIXED_NOW + timedelta(hours=1),
    )
    rows = get_tutor_sessions_future(db_session, tutor.id)
    assert len(rows) == 1


def test_get_tutor_sessions_past_excludes_end_at_now(monkeypatch, db_session):
    monkeypatch.setattr("app.crud.sessions.datetime", _FrozenDatetime)
    tutor, student, _ = _create_users(db_session)
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        start=FIXED_NOW - timedelta(hours=1),
        end=FIXED_NOW,
    )
    assert get_tutor_sessions_past(db_session, tutor.id) == []
