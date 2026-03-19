# tests/unit/test_auth.py
import pytest
from app.auth import verify_password, create_access_token, hash_password



def test_hash_and_verify_password_roundtrip():
    hashed = hash_password("password123")
    assert verify_password("password123", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_access_token_returns_string():
    token = create_access_token(sub="1")
    assert isinstance(token, str)
    assert len(token) > 10

