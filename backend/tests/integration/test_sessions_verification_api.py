from datetime import datetime, timedelta, timezone

from app.auth import verify_password
from app.crud.users import create_user
from app.models import TutoringSession
from app.schemas import UserCreate


def _create_test_user(db_session, *, email: str, password: str, is_tutor: bool, is_student: bool):
    return create_user(
        db_session,
        UserCreate(
            email=email,
            first_name="Test",
            last_name="User",
            password=password,
            is_tutor=is_tutor,
            is_student=is_student,
        ),
    )


def _auth_headers(client, *, email: str, password: str) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_session(db_session, *, tutor_id: int, student_id: int) -> TutoringSession:
    start = datetime.now(timezone.utc) + timedelta(days=1)
    session = TutoringSession(
        tutor_id=tutor_id,
        student_id=student_id,
        subject="CS 251",
        scheduled_start=start,
        scheduled_end=start + timedelta(hours=1),
        cost_cents=2500,
        notes="test session",
        status="confirmed",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def test_student_can_generate_verification_code_and_hash_is_stored(client, db_session):
    tutor = _create_test_user(
        db_session,
        email="tutor_session@purdue.edu",
        password="password123",
        is_tutor=True,
        is_student=False,
    )
    student = _create_test_user(
        db_session,
        email="student_session@purdue.edu",
        password="password123",
        is_tutor=False,
        is_student=True,
    )
    tutoring_session = _create_session(db_session, tutor_id=tutor.id, student_id=student.id)
    student_headers = _auth_headers(
        client,
        email="student_session@purdue.edu",
        password="password123",
    )

    response = client.post(
        f"/sessions/{tutoring_session.id}/verification-code",
        headers=student_headers,
    )

    assert response.status_code == 200
    code = response.json()["verification_code"]
    assert len(code) == 6
    assert code.isdigit()

    db_session.refresh(tutoring_session)
    assert tutoring_session.verification_code_hash is not None
    assert verify_password(code, tutoring_session.verification_code_hash)
    assert tutoring_session.is_verified is False


def test_non_student_in_session_cannot_generate_verification_code(client, db_session):
    tutor = _create_test_user(
        db_session,
        email="tutor_only@purdue.edu",
        password="password123",
        is_tutor=True,
        is_student=False,
    )
    student = _create_test_user(
        db_session,
        email="student_only@purdue.edu",
        password="password123",
        is_tutor=False,
        is_student=True,
    )
    tutoring_session = _create_session(db_session, tutor_id=tutor.id, student_id=student.id)
    tutor_headers = _auth_headers(
        client,
        email="tutor_only@purdue.edu",
        password="password123",
    )

    response = client.post(
        f"/sessions/{tutoring_session.id}/verification-code",
        headers=tutor_headers,
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only the student in this session can generate a verification code."


def test_tutor_can_verify_correct_pin_and_session_becomes_verified(client, db_session):
    tutor = _create_test_user(
        db_session,
        email="verify_tutor@purdue.edu",
        password="password123",
        is_tutor=True,
        is_student=False,
    )
    student = _create_test_user(
        db_session,
        email="verify_student@purdue.edu",
        password="password123",
        is_tutor=False,
        is_student=True,
    )
    tutoring_session = _create_session(db_session, tutor_id=tutor.id, student_id=student.id)

    student_headers = _auth_headers(
        client,
        email="verify_student@purdue.edu",
        password="password123",
    )
    tutor_headers = _auth_headers(
        client,
        email="verify_tutor@purdue.edu",
        password="password123",
    )

    generate_response = client.post(
        f"/sessions/{tutoring_session.id}/verification-code",
        headers=student_headers,
    )
    code = generate_response.json()["verification_code"]

    verify_response = client.post(
        f"/sessions/{tutoring_session.id}/verify-code",
        headers=tutor_headers,
        json={"pin": code},
    )

    assert verify_response.status_code == 200
    assert verify_response.json() == {"message": "Verification code accepted"}

    db_session.refresh(tutoring_session)
    assert tutoring_session.is_verified is True


def test_non_tutor_in_session_cannot_verify_pin(client, db_session):
    tutor = _create_test_user(
        db_session,
        email="real_tutor@purdue.edu",
        password="password123",
        is_tutor=True,
        is_student=False,
    )
    student = _create_test_user(
        db_session,
        email="real_student@purdue.edu",
        password="password123",
        is_tutor=False,
        is_student=True,
    )
    tutoring_session = _create_session(db_session, tutor_id=tutor.id, student_id=student.id)
    student_headers = _auth_headers(
        client,
        email="real_student@purdue.edu",
        password="password123",
    )
    tutor_headers = _auth_headers(
        client,
        email="real_tutor@purdue.edu",
        password="password123",
    )

    generate_response = client.post(
        f"/sessions/{tutoring_session.id}/verification-code",
        headers=student_headers,
    )
    code = generate_response.json()["verification_code"]

    response = client.post(
        f"/sessions/{tutoring_session.id}/verify-code",
        headers=student_headers,
        json={"pin": code},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only the tutor in this session can verify the code."

    # sanity: actual tutor can still verify after the student's failed attempt
    tutor_response = client.post(
        f"/sessions/{tutoring_session.id}/verify-code",
        headers=tutor_headers,
        json={"pin": code},
    )
    assert tutor_response.status_code == 200


