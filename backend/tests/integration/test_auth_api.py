"""Integration tests for API endpoints using the client fixture."""
import pytest
from app.crud.users import create_user
from app.schemas import UserCreate


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