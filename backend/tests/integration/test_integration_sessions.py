"""Integration tests for /sessions/tutor/past and /sessions/tutor/future."""

from datetime import datetime, timedelta, timezone

from app.crud.users import create_user
from app.models import TutoringSession
from app.schemas import UserCreate


def _auth_header(client, email: str, password: str) -> dict[str, str]:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    assert token
    return {"Authorization": f"Bearer {token}"}


def _create_tutor_and_student(db_session):
    tutor = create_user(
        db_session,
        UserCreate(
            email="int_tutor@purdue.edu",
            first_name="Int",
            last_name="Tutor",
            password="password123",
            is_tutor=True,
            is_student=False,
        ),
    )
    student = create_user(
        db_session,
        UserCreate(
            email="int_student@purdue.edu",
            first_name="Int",
            last_name="Student",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()
    return tutor, student


def _add_session(db_session, **kwargs):
    s = TutoringSession(**kwargs)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def test_tutor_past_returns_json_list_ordered(client, db_session):
    tutor, student = _create_tutor_and_student(db_session)
    now = datetime.now(timezone.utc)

    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        scheduled_start=now - timedelta(days=2),
        scheduled_end=now - timedelta(days=2) + timedelta(hours=1),
        subject="MA 161",
        cost_cents=4000,
        status="completed",
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        scheduled_start=now - timedelta(days=1),
        scheduled_end=now - timedelta(days=1) + timedelta(hours=1),
        subject="CS 180",
        cost_cents=5000,
        status="completed",
    )

    headers = _auth_header(client, "int_tutor@purdue.edu", "password123")
    r = client.get("/sessions/tutor/past", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["subject"] == "CS 180"
    assert data[1]["subject"] == "MA 161"
    assert data[0]["tutor_id"] == tutor.id


def test_tutor_future_returns_only_upcoming(client, db_session):
    tutor, student = _create_tutor_and_student(db_session)
    now = datetime.now(timezone.utc)

    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        scheduled_start=now - timedelta(hours=2),
        scheduled_end=now - timedelta(hours=1),
        subject="Past",
        cost_cents=1000,
        status="completed",
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        scheduled_start=now + timedelta(days=1),
        scheduled_end=now + timedelta(days=1) + timedelta(hours=1),
        subject="Soon",
        cost_cents=2000,
        status="confirmed",
    )
    _add_session(
        db_session,
        tutor_id=tutor.id,
        student_id=student.id,
        scheduled_start=now + timedelta(days=3),
        scheduled_end=now + timedelta(days=3) + timedelta(hours=1),
        subject="Later",
        cost_cents=2000,
        status="confirmed",
    )

    headers = _auth_header(client, "int_tutor@purdue.edu", "password123")
    r = client.get("/sessions/tutor/future", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert [x["subject"] for x in data] == ["Soon", "Later"]


def test_student_forbidden_on_tutor_past_and_future(client, db_session):
    create_user(
        db_session,
        UserCreate(
            email="only_student@purdue.edu",
            first_name="S",
            last_name="Only",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()

    headers = _auth_header(client, "only_student@purdue.edu", "password123")
    r1 = client.get("/sessions/tutor/past", headers=headers)
    r2 = client.get("/sessions/tutor/future", headers=headers)

    assert r1.status_code == 403
    assert r1.json()["detail"] == "Only tutors can access tutor sessions."
    assert r2.status_code == 403
    assert r2.json()["detail"] == "Only tutors can access tutor sessions."


def test_tutor_sessions_unauthorized_without_token(client):
    assert client.get("/sessions/tutor/past").status_code == 401
    assert client.get("/sessions/tutor/future").status_code == 401
