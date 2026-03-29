"""CRUD operations for Review.

- create_review (student reviews a completed session)
- get_review_by_id
- get_review_by_session_id
- get_reviews_by_tutor (via sessions)
- get_reviews_by_student
- update_review
- delete_review
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Review, TutoringSession
from app.schemas import ReviewCreate, ReviewUpdate


def create_review(db: Session, student_id: int, data: ReviewCreate) -> Review:
    """Create a new review for a completed tutoring session."""
    # Verify the session exists and belongs to this student
    session = db.get(TutoringSession, data.session_id)
    if not session:
        raise ValueError("Session not found")
    if session.student_id != student_id:
        raise ValueError("You can only review sessions you participated in as a student")
    if session.status != "completed":
        raise ValueError("You can only review completed sessions")
    
    # Check if review already exists for this session
    existing = db.execute(
        select(Review).where(Review.session_id == data.session_id)
    ).scalar_one_or_none()
    if existing:
        raise ValueError("You have already reviewed this session")

    review = Review(
        session_id=data.session_id,
        class_id=data.class_id,
        rating=data.rating,
        comment=data.comment,
        is_anonymous=data.is_anonymous,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def get_review_by_id(db: Session, review_id: int) -> Optional[Review]:
    """Get a single review by ID."""
    return db.get(Review, review_id)


def get_review_by_session_id(db: Session, session_id: int) -> Optional[Review]:
    """Get a review by session ID."""
    return db.execute(
        select(Review).where(Review.session_id == session_id)
    ).scalar_one_or_none()


def get_reviews_by_tutor(db: Session, tutor_user_id: int) -> list[Review]:
    """Get all reviews for a tutor (via their tutoring sessions)."""
    stmt = (
        select(Review)
        .join(TutoringSession, Review.session_id == TutoringSession.id)
        .where(TutoringSession.tutor_id == tutor_user_id)
        .order_by(Review.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def get_reviews_by_student(db: Session, student_user_id: int) -> list[Review]:
    """Get all reviews written by a student."""
    stmt = (
        select(Review)
        .join(TutoringSession, Review.session_id == TutoringSession.id)
        .where(TutoringSession.student_id == student_user_id)
        .order_by(Review.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def update_review(db: Session, review: Review, data: ReviewUpdate) -> Review:
    """Update an existing review."""
    if data.rating is not None:
        review.rating = data.rating
    if data.comment is not None:
        review.comment = data.comment
    if data.is_anonymous is not None:
        review.is_anonymous = data.is_anonymous
    
    db.commit()
    db.refresh(review)
    return review


def delete_review(db: Session, review: Review) -> None:
    """Delete a review."""
    db.delete(review)
    db.commit()