"""CRUD operations for TutorProfile.

- create_tutor_profile (link to existing user)
- get_tutor_profile_by_user_id
- get_tutor_profile_by_id
- update_tutor_profile
- delete_tutor_profile
- list_tutors (with optional filters: subject, rating, availability)
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import TutorProfile, User, TutorClass, Class
from app.schemas import TutorProfileCreate, TutorProfileUpdate


def create_tutor_profile(db: Session, user_id: int, data: TutorProfileCreate) -> TutorProfile:
    """Create a tutor profile for an existing user."""
    # Check if user exists
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    
    # Check if tutor profile already exists
    existing = get_tutor_profile_by_user_id(db, user_id)
    if existing:
        raise ValueError("Tutor profile already exists for this user")
    
    # Update user to be a tutor
    user.is_tutor = True
    
    tutor = TutorProfile(
        user_id=user_id,
        bio=data.bio,
        hourly_rate_cents=data.hourly_rate_cents,
        major=data.major,
        grad_year=data.grad_year,
    )
    db.add(tutor)
    db.commit()
    db.refresh(tutor)
    return tutor


def get_tutor_profile_by_user_id(db: Session, user_id: int) -> Optional[TutorProfile]:
    """Get a tutor profile by user ID."""
    return db.execute(
        select(TutorProfile).where(TutorProfile.user_id == user_id)
    ).scalar_one_or_none()


def get_tutor_profile_by_id(db: Session, tutor_id: int) -> Optional[TutorProfile]:
    """Get a tutor profile by tutor profile ID."""
    return db.get(TutorProfile, tutor_id)


def update_tutor_profile(db: Session, tutor: TutorProfile, data: TutorProfileUpdate) -> TutorProfile:
    """Update a tutor profile."""
    if data.bio is not None:
        tutor.bio = data.bio
    if data.hourly_rate_cents is not None:
        tutor.hourly_rate_cents = data.hourly_rate_cents
    if data.major is not None:
        tutor.major = data.major
    if data.grad_year is not None:
        tutor.grad_year = data.grad_year
    
    db.commit()
    db.refresh(tutor)
    return tutor


def delete_tutor_profile(db: Session, tutor: TutorProfile) -> None:
    """Delete a tutor profile."""
    # Also update user.is_tutor to False
    tutor.user.is_tutor = False
    db.delete(tutor)
    db.commit()


def list_tutors(
    db: Session,
    subject: Optional[str] = None,
    min_rating: Optional[float] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[TutorProfile]:
    """List tutors with optional filters."""
    stmt = select(TutorProfile)
    
    # Filter by subject if provided
    if subject:
        stmt = (
            stmt
            .join(TutorClass, TutorProfile.id == TutorClass.tutor_id)
            .join(Class, TutorClass.class_id == Class.id)
            .where(Class.subject == subject.upper())
        )
    
    stmt = stmt.offset(skip).limit(limit)
    tutors = list(db.execute(stmt).scalars().all())
    
    # Filter by rating in Python (since it's a computed property)
    if min_rating is not None:
        tutors = [t for t in tutors if t.average_rating and t.average_rating >= min_rating]
    
    return tutors
