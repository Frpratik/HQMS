import pytest
import jwt
from datetime import timedelta
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.core.config import settings


def test_password_hashing_and_verification():
    """Verify password hashing produces secure hashes and verifies correctly."""
    plain_password = "SecretPassword123!"
    hashed = get_password_hash(plain_password)

    assert hashed != plain_password
    assert verify_password(plain_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_lifecycle():
    """Verify JWT access token creation, subject encoding, and successful decode."""
    user_id = "12345678-1234-5678-1234-567812345678"
    role = "DOCTOR"
    token = create_access_token(subject=user_id, role=role)

    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["role"] == role
    assert "exp" in payload


def test_jwt_tampered_token_rejection():
    """Verify tampered token raises PyJWTError."""
    user_id = "12345678-1234-5678-1234-567812345678"
    token = create_access_token(subject=user_id)

    # Tamper with token
    tampered_token = token[:-5] + "ABCDE"
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(tampered_token)
