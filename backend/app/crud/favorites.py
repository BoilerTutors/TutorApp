from typing import Optional

from sqlalchemy.orm import Session

from app.models import Favorite, Review, TutorClass, TutorProfile, TutoringSession, User, Class


def get_favorite(db: Session, *, student_id: int, tutor_id: int) -> Optional[Favorite]:
    return (
        db.query(Favorite)
        .filter(Favorite.student_id == student_id, Favorite.tutor_id == tutor_id)
        .first()
    )


def create_favorite(db: Session, *, student_id: int, tutor_id: int) -> Favorite:
    fav = Favorite(student_id=student_id, tutor_id=tutor_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def delete_favorite(db: Session, *, favorite: Favorite) -> None:
    db.delete(favorite)
    db.commit()


def list_favorites_for_student(db: Session, *, student_id: int) -> list[dict]:
    """Returns favorites with tutor profile, rating, and subject info bundled in."""
    favorites = (
        db.query(Favorite)
        .filter(Favorite.student_id == student_id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

    results: list[dict] = []
    for fav in favorites:
        tutor_user = db.get(User, fav.tutor_id)
        if tutor_user is None:
            continue

        tutor_profile = (
            db.query(TutorProfile).filter(TutorProfile.user_id == fav.tutor_id).first()
        )

        # Compute average rating from completed sessions where this tutor was the tutor
        review_rows = (
            db.query(Review.rating)
            .join(TutoringSession, Review.session_id == TutoringSession.id)
            .filter(TutoringSession.tutor_id == fav.tutor_id)
            .all()
        )
        review_count = len(review_rows)
        average_rating = (
            sum(r.rating for r in review_rows) / review_count
            if review_count > 0
            else None
        )

        # Subjects: from tutor_classes joined with classes
        subjects: list[str] = []
        if tutor_profile is not None:
            subject_rows = (
                db.query(Class.subject, Class.class_number)
                .join(TutorClass, TutorClass.class_id == Class.id)
                .filter(TutorClass.tutor_id == tutor_profile.id)
                .order_by(Class.subject.asc(), Class.class_number.asc())
                .all()
            )
            subjects = [f"{s} {n}" for s, n in subject_rows]

        results.append(
            {
                "favorite_id": fav.id,
                "tutor_id": fav.tutor_id,
                "first_name": tutor_user.first_name,
                "last_name": tutor_user.last_name,
                "major": tutor_profile.major if tutor_profile else None,
                "bio": tutor_profile.bio if tutor_profile else None,
                "hourly_rate_cents": tutor_profile.hourly_rate_cents if tutor_profile else None,
                "average_rating": average_rating,
                "review_count": review_count,
                "subjects": subjects,
                "created_at": fav.created_at,
            }
        )

    return results