"""Integration tests for /admin/users/{id}/status."""

from app.crud.admin import create_admin
from app.crud.users import create_user
from app.schemas import AdminCreate, UserCreate


def _admin_auth_header(client, email: str, password: str) -> dict[str, str]:
    r = client.post("/admin/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    assert token
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_toggle_user_status_0_to_1_and_back(client, db_session):
    create_admin(
        db_session,
        AdminCreate(email="admin@purdue.edu", password="password123"),
    )
    user = create_user(
        db_session,
        UserCreate(
            email="toggleme@purdue.edu",
            first_name="Toggle",
            last_name="Me",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()
    db_session.refresh(user)
    assert user.status == 0

    headers = _admin_auth_header(client, "admin@purdue.edu", "password123")

    r1 = client.patch(f"/admin/users/{user.id}/status", json={}, headers=headers)
    assert r1.status_code == 200, r1.text
    db_session.refresh(user)
    assert user.status == 1

    r2 = client.patch(f"/admin/users/{user.id}/status", json={}, headers=headers)
    assert r2.status_code == 200, r2.text
    db_session.refresh(user)
    assert user.status == 0


def test_non_admin_cannot_toggle_user_status(client, db_session):
    user = create_user(
        db_session,
        UserCreate(
            email="normal@purdue.edu",
            first_name="Normal",
            last_name="User",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()
    db_session.refresh(user)

    r = client.patch(f"/admin/users/{user.id}/status", json={})
    assert r.status_code == 401
