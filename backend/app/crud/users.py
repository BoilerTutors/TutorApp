from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password
from app.models import User, TutorProfile, StudentProfile
from app.schemas import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, data: UserCreate) -> User:
    """
    Create a new User (and optional Tutor/Student profiles) from a UserCreate schema.
    Password is hashed before storing.
    """
    email = str(data.email).strip().lower()
    existing = get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")

    user = User(
        email=email,
        first_name=data.first_name,
        last_name=data.last_name,
        hashed_password=hash_password(data.password),
        is_tutor=data.is_tutor,
        is_student=data.is_student,
    )
    print(user)
    db.add(user)
    db.flush()  # assign user.id so we can create related rows

    if data.tutor_profile is not None:
        tutor = TutorProfile(
            user_id=user.id,
            bio=data.tutor_profile.bio,
            hourly_rate_cents=data.tutor_profile.hourly_rate_cents,
            major=data.tutor_profile.major,
            grad_year=data.tutor_profile.grad_year,
        )
        db.add(tutor)

    if data.student_profile is not None:
        student = StudentProfile(
            user_id=user.id,
            major=data.student_profile.major,
            grad_year=data.student_profile.grad_year,
        )
        db.add(student)

    db.commit()
    db.refresh(user)
    return user
