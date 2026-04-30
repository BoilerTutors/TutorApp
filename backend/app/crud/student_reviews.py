"""CRUD operations for student reviews left by tutors."""

from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models import StudentReview, TutoringSession, User


def tutor_has_completed_session_with_student(
    db: Session, tutor_user_id: int, student_user_id: int
) -> bool:
    row = db.execute(
        select(TutoringSession.id)
        .where(
            and_(
                TutoringSession.tutor_id == tutor_user_id,
                TutoringSession.student_id == student_user_id,
                TutoringSession.status == "completed",
            )
        )
        .limit(1)
    ).scalar_one_or_none()
    return row is not None


def create_student_review(
    db: Session,
    tutor_user_id: int,
    student_user_id: int,
    review_text: str,
    rating: float,
) -> StudentReview:
    """Create a review for a student account.

    Rules:
    - reviewer must be a tutor account
    - target must be a student account
    - rating must be in [0.0, 5.0]
    """
    tutor_user = db.get(User, tutor_user_id)
    if not tutor_user:
        raise ValueError("Tutor user not found")
    if not tutor_user.is_tutor:
        raise ValueError("Only tutors can leave student reviews")

    student_user = db.get(User, student_user_id)
    if not student_user:
        raise ValueError("Student user not found")
    if not student_user.is_student:
        raise ValueError("Target user is not a student")

    if tutor_user.tutor is None:
        raise ValueError("Tutor profile not found for this account")

    if not tutor_has_completed_session_with_student(db, tutor_user_id, student_user_id):
        raise ValueError("You can only review students you have completed a session with")

    if rating < 0.0 or rating > 5.0:
        raise ValueError("Rating must be between 0.0 and 5.0")

    text = review_text.strip()
    if not text:
        raise ValueError("Review text is required")

    review = StudentReview(
        student_id=student_user_id,
        tutor_id=tutor_user.tutor.id,
        review_text=text,
        rating=rating,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def get_student_review_by_id(db: Session, review_id: int) -> Optional[StudentReview]:
    """Get a student review by primary key."""
    return db.get(StudentReview, review_id)


def list_student_reviews_for_student(db: Session, student_user_id: int) -> list[StudentReview]:
    """List all reviews for a given student ordered by newest first."""
    stmt = (
        select(StudentReview)
        .where(StudentReview.student_id == student_user_id)
        .order_by(StudentReview.review_timestamp.desc())
    )
    return list(db.execute(stmt).scalars().all())

