"""Integration tests for API endpoints using the client fixture."""
from datetime import datetime, timedelta, timezone

import pytest
from app.crud.users import create_user
from app.crud.users import get_user_by_email
from app.schemas import UserCreate
from app.routers import auth as auth_router


def create_test_user(db_session, **overrides):
    user = create_user(
        db_session,
        UserCreate(
            email=overrides.pop("email", "student@purdue.edu"),
            first_name=overrides.pop("first_name", "Test"),
            last_name=overrides.pop("last_name", "User"),
            password=overrides.pop("password", "password123"),
            is_tutor=overrides.pop("is_tutor", False),
            is_student=overrides.pop("is_student", True),
        ),
    )

    for field, value in overrides.items():
        setattr(user, field, value)

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_root_returns_api_info(client):
    """GET / returns 200 and the API message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "BoilerTutors API"
    assert "docs" in data


def test_login_success(client, db_session):
    """POST /auth/login with valid credentials returns 200 and a token."""
    create_user(
        db_session,
        UserCreate(
            email="student@purdue.edu",
            first_name="Test",
            last_name="User",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()

    response = client.post(
        "/auth/login",
        json={"email": "student@purdue.edu", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_returns_401(client, db_session):
    """POST /auth/login with wrong password returns 401."""
    create_user(
        db_session,
        UserCreate(
            email="other@purdue.edu",
            first_name="Other",
            last_name="User",
            password="correctpass",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()

    response = client.post(
        "/auth/login",
        json={"email": "other@purdue.edu", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user_returns_401(client):
    """POST /auth/login for unknown email returns 401."""
    response = client.post(
        "/auth/login",
        json={"email": "nobody@purduexyz.edu", "password": "anything"},
    )
    assert response.status_code == 401


def test_login_with_mfa_enabled_returns_mfa_required_and_persists_code(client, db_session, monkeypatch):
    sent_emails = []
    create_test_user(db_session, email="mfauser@purdue.edu", mfa_enabled=True, mfa_code_attempts=2)

    monkeypatch.setattr(auth_router, "_generate_otp", lambda: "123456")
    monkeypatch.setattr(auth_router, "send_otp_email", lambda email, otp: sent_emails.append((email, otp)))

    response = client.post(
        "/auth/login",
        json={"email": "mfauser@purdue.edu", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "access_token": None,
        "token_type": "bearer",
        "mfa_required": True,
    }

    user = get_user_by_email(db_session, "mfauser@purdue.edu")
    assert user is not None
    assert user.mfa_code == "123456"
    assert user.mfa_code_attempts == 0
    assert user.mfa_expires_at is not None
    assert user.mfa_expires_at > datetime.now(timezone.utc)
    assert sent_emails == [("mfauser@purdue.edu", "123456")]


def test_verify_mfa_returns_400_when_account_has_mfa_disabled(client, db_session):
    create_test_user(db_session, email="nomfa@purdue.edu", mfa_enabled=False)

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "nomfa@purdue.edu", "code": "123456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "MFA is not enabled for this account"


def test_verify_mfa_returns_400_when_no_pending_code(client, db_session):
    create_test_user(db_session, email="pending@purdue.edu", mfa_enabled=True)

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "pending@purdue.edu", "code": "123456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "No pending MFA code. Please log in again."


def test_verify_mfa_clears_expired_code(client, db_session):
    create_test_user(
        db_session,
        email="expired@purdue.edu",
        mfa_enabled=True,
        mfa_code="123456",
        mfa_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        mfa_code_attempts=1,
    )

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "expired@purdue.edu", "code": "123456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "MFA code has expired. Please log in again."

    user = get_user_by_email(db_session, "expired@purdue.edu")
    assert user is not None
    assert user.mfa_code is None
    assert user.mfa_expires_at is None


def test_verify_mfa_returns_429_after_too_many_attempts(client, db_session):
    create_test_user(
        db_session,
        email="locked@purdue.edu",
        mfa_enabled=True,
        mfa_code="123456",
        mfa_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        mfa_code_attempts=auth_router.settings.mfa_max_attempts,
    )

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "locked@purdue.edu", "code": "123456"},
    )

    assert response.status_code == 429
    assert response.json()["detail"] == "Too many failed attempts. Please wait 5 minutes before trying again."

    user = get_user_by_email(db_session, "locked@purdue.edu")
    assert user is not None
    assert user.mfa_code is None
    assert user.mfa_expires_at is None


def test_verify_mfa_increments_attempts_for_wrong_code(client, db_session):
    create_test_user(
        db_session,
        email="wrongcode@purdue.edu",
        mfa_enabled=True,
        mfa_code="123456",
        mfa_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        mfa_code_attempts=1,
    )

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "wrongcode@purdue.edu", "code": "654321"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect MFA code"

    user = get_user_by_email(db_session, "wrongcode@purdue.edu")
    assert user is not None
    assert user.mfa_code_attempts == 2
    assert user.mfa_code == "123456"


def test_verify_mfa_returns_token_and_clears_state_on_success(client, db_session):
    create_test_user(
        db_session,
        email="success@purdue.edu",
        mfa_enabled=True,
        mfa_code="123456",
        mfa_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        mfa_code_attempts=2,
    )

    response = client.post(
        "/auth/verify-mfa",
        json={"email": "success@purdue.edu", "code": "123456"},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 10
    assert data["token_type"] == "bearer"
    assert data["mfa_required"] is False

    user = get_user_by_email(db_session, "success@purdue.edu")
    assert user is not None
    assert user.mfa_code is None
    assert user.mfa_expires_at is None
    assert user.mfa_code_attempts == 0
