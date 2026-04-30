from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session  # type: ignore[import]

from app.auth import hash_password
from app.crud.embeddings import refresh_student_embeddings, refresh_tutor_embeddings
from app.models import User, TutorProfile, StudentProfile, TutorClass, StudentClass
from app.schemas import ProfileUpdate, UserCreate, SecurityPreferencesUpdate



def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.get(User, user_id)


def search_users(
    db: Session,
    query: str | None = None,
    limit: int = 200,
) -> list[User]:
    stmt = db.query(User)
    if query and query.strip():
        q = f"%{query.strip()}%"
        stmt = stmt.filter(
            or_(
                User.first_name.ilike(q),
                User.last_name.ilike(q),
                User.email.ilike(q),
                (User.first_name + " " + User.last_name).ilike(q),
            )
        )
    return stmt.order_by(User.id.desc()).limit(limit).all()


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
            help_provided=data.tutor_profile.help_provided or None,
            session_mode=data.tutor_profile.session_mode or "both",
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
                        has_taed=tc.has_taed,
                    )
                )
        refresh_tutor_embeddings(db, tutor)

    if data.student_profile is not None:
        student = StudentProfile(
            user_id=user.id,
            bio=data.student_profile.bio,
            major=data.student_profile.major,
            grad_year=data.student_profile.grad_year,
            preferred_locations=data.student_profile.preferred_locations or None,
            help_needed=data.student_profile.help_needed or None,
            session_mode=data.student_profile.session_mode or "both",
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
        refresh_student_embeddings(db, student)

    db.commit()
    db.refresh(user)
    return user


def update_user_profile(db: Session, user: User, data: ProfileUpdate) -> User:
    """Update user first/last name and optionally tutor/student profile fields."""
    tutor_classes_were_replaced = False
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.tutor_profile is not None and user.is_tutor:
        # is_tutor can be true without a tutors row (bad data or legacy accounts); create so PATCH applies.
        if user.tutor is None:
            new_tutor = TutorProfile(user_id=user.id)
            db.add(new_tutor)
            db.flush()
            user.tutor = new_tutor
        t = data.tutor_profile
        tutor_embedding_needs_refresh = False
        if t.bio is not None:
            user.tutor.bio = t.bio
            tutor_embedding_needs_refresh = True
        if t.hourly_rate_cents is not None:
            user.tutor.hourly_rate_cents = t.hourly_rate_cents
        if t.major is not None:
            user.tutor.major = t.major
        if t.grad_year is not None:
            user.tutor.grad_year = t.grad_year
        if t.preferred_locations is not None:
            user.tutor.preferred_locations = t.preferred_locations or None
            tutor_embedding_needs_refresh = True
        if t.help_provided is not None:
            user.tutor.help_provided = t.help_provided or None
            tutor_embedding_needs_refresh = True
        if t.session_mode is not None:
            user.tutor.session_mode = t.session_mode
        if t.classes is not None:
            for tc in user.tutor.classes_tutoring:
                db.delete(tc)
            db.flush()
            for tc in t.classes:
                db.add(
                    TutorClass(
                        tutor_id=user.tutor.id,
                        class_id=tc.class_id,
                        semester=tc.semester,
                        year_taken=tc.year_taken,
                        grade_received=tc.grade_received,
                        has_taed=tc.has_taed,
                    )
                )
            tutor_embedding_needs_refresh = True
            tutor_classes_were_replaced = True
        if tutor_embedding_needs_refresh:
            refresh_tutor_embeddings(db, user.tutor)
    if data.student_profile is not None and user.is_student:
        if user.student is None:
            new_student = StudentProfile(user_id=user.id)
            db.add(new_student)
            db.flush()
            user.student = new_student
        s = data.student_profile
        student_embedding_needs_refresh = False
        if s.bio is not None:
            user.student.bio = s.bio
            student_embedding_needs_refresh = True
        if s.major is not None:
            user.student.major = s.major
        if s.grad_year is not None:
            user.student.grad_year = s.grad_year
        if s.preferred_locations is not None:
            user.student.preferred_locations = s.preferred_locations or None
            student_embedding_needs_refresh = True
        if s.help_needed is not None:
            user.student.help_needed = s.help_needed or None
            student_embedding_needs_refresh = True
        if s.session_mode is not None:
            user.student.session_mode = s.session_mode
        if student_embedding_needs_refresh:
            refresh_student_embeddings(db, user.student)
    db.commit()
    db.refresh(user)
    # expire_on_commit=False: in-memory classes_tutoring can be stale after replace; force reload on read.
    if tutor_classes_were_replaced and user.tutor is not None:
        db.expire(user.tutor, ["classes_tutoring"])
    return user


def delete_user(db: Session, user: User) -> None:
    """Permanently delete a user and all related data (cascade)."""
    db.delete(user)
    db.commit()


# change a user's security preferences
def update_user_security_preferences(db: Session, user: User, data: SecurityPreferencesUpdate) -> User:
    """Update the current user's security preferences."""
    user.mfa_enabled = data.mfa_enabled
    db.commit()
    db.refresh(user)
    return user


def toggle_user_active_status(db: Session, user: User) -> User:
    """Toggle a user's status between active (0) and disabled (1)."""
    user.status = 1 if user.status == 0 else 0
    db.commit()
    db.refresh(user)
    return user
