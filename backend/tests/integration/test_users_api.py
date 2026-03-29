import pytest


def test_users_me_requires_auth(client):
    # Test that the /users/me endpoint requires authentication
    response = client.get("/users/me")
    assert response.status_code == 401


def test_register_user_flow(client):
    # Test the register user flow
    response = client.post("/users/", json={
        "email": "seeded@purdue.edu",
        "first_name": "Seeded",
        "last_name": "User",
        "password": "password123",
        "is_tutor": False,
        "is_student": True,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "seeded@purdue.edu"
    assert data["first_name"] == "Seeded"
    assert data["last_name"] == "User"
    assert data["is_tutor"] == False
    assert data["is_student"] == True

