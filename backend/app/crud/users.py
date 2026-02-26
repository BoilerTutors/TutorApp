from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password
from app.models import User, TutorProfile, StudentProfile, TutorClass, StudentClass
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
    db.add(user)
    db.flush()  # assign user.id so we can create related rows

    if data.tutor_profile is not None:
        tutor = TutorProfile(
            user_id=user.id,
            bio=data.tutor_profile.bio,
            hourly_rate_cents=data.tutor_profile.hourly_rate_cents,
            major=data.tutor_profile.major,
            grad_year=data.tutor_profile.grad_year,
            preferred_locations=data.tutor_profile.preferred_locations or None,
        )
        db.add(tutor)
        db.flush()
        if data.tutor_profile.classes:
            for tc in data.tutor_profile.classes:
                db.add(
                    TutorClass(
                        tutor_id=tutor.id,
                        class_id=tc.class_id,
                        semester=tc.semester,
                        year_taken=tc.year_taken,
                        grade_received=tc.grade_received,
                    )
                )

    if data.student_profile is not None:
        student = StudentProfile(
            user_id=user.id,
            major=data.student_profile.major,
            grad_year=data.student_profile.grad_year,
            preferred_locations=data.student_profile.preferred_locations or None,
        )
        db.add(student)
        db.flush()
        if data.student_profile.classes:
            for sc in data.student_profile.classes:
                db.add(
                    StudentClass(
                        student_id=student.id,
                        class_id=sc.class_id,
                        help_level=sc.help_level,
                        estimated_grade=sc.estimated_grade,
                    )
                )

    db.commit()
    db.refresh(user)
    return user
