"""CRUD operations for Class, StudentClass, and TutorClass."""
from sqlalchemy.orm import Session, joinedload  # type: ignore[import]

from app.models import Class, TutorClass, StudentClass, TutorProfile, StudentProfile


def list_classes(
    db: Session,
    subject: str | None = None,
    professor: str | None = None,
) -> list[Class]:
    """List classes with optional filters."""
    q = db.query(Class)
    if subject:
        q = q.filter(Class.subject.ilike(f"%{subject}%"))
    if professor:
        q = q.filter(Class.professor.ilike(f"%{professor}%"))
    return list(q.order_by(Class.subject, Class.class_number).all())


def get_class_by_id(db: Session, class_id: int) -> Class | None:
    """Get a class by id."""
    return db.get(Class, class_id)
