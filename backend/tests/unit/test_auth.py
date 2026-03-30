import re

from app.auth import verify_password, create_access_token, hash_password
from app.routers.auth import _generate_otp


def test_hash_and_verify_password_roundtrip():
    hashed = hash_password("password123")
    assert verify_password("password123", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_access_token_returns_string():
    token = create_access_token(sub="1")
    assert isinstance(token, str)
    assert len(token) > 10


def test_generate_otp_returns_six_digit_numeric_string():
    otp = _generate_otp()
    assert isinstance(otp, str)
    assert re.fullmatch(r"\d{6}", otp) is not None
