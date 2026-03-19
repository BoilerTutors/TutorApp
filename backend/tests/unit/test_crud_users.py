import pytest

from app.crud.users import create_user, get_user_by_email
from app.schemas import UserCreate


def test_get_user_by_email_returns_none_when_missing(db_session):
    assert get_user_by_email(db_session, "nobody@purdue.edu") is None


def test_create_user_persists_and_can_be_fetched(db_session):
    create_user(
        db_session,
        UserCreate(
            email="unituser@purdue.edu",
            first_name="Unit",
            last_name="User",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()

    user = get_user_by_email(db_session, "unituser@purdue.edu")
    assert user is not None
    assert user.email == "unituser@purdue.edu"


def test_create_user_duplicate_email_raises(db_session):
    create_user(
        db_session,
        UserCreate(
            email="dupe@purdue.edu",
            first_name="Dupe",
            last_name="User",
            password="password123",
            is_tutor=False,
            is_student=True,
        ),
    )
    db_session.commit()

    with pytest.raises(ValueError):
        create_user(
            db_session,
            UserCreate(
                email="dupe@purdue.edu",
                first_name="Dupe2",
                last_name="User2",
                password="password123",
                is_tutor=False,
                is_student=True,
            ),
        )

