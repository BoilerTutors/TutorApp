"""CRUD operations for UserAvailability time slots."""

from sqlalchemy.orm import Session  # type: ignore[import]

from app.models import UserAvailability
from app.schemas import AvailabilityCreate


def get_availability_by_user_id(db: Session, user_id: int) -> list[UserAvailability]:
    return (
        db.query(UserAvailability)
        .filter(UserAvailability.user_id == user_id)
        .order_by(UserAvailability.day_of_week, UserAvailability.start_time)
        .all()
    )


def create_availability(
    db: Session, user_id: int, data: AvailabilityCreate
) -> UserAvailability:
    slot = UserAvailability(
        user_id=user_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def delete_availability(db: Session, slot_id: int, user_id: int) -> bool:
    slot = (
        db.query(UserAvailability)
        .filter(UserAvailability.id == slot_id, UserAvailability.user_id == user_id)
        .first()
    )
    if not slot:
        return False
    db.delete(slot)
    db.commit()
    return True
