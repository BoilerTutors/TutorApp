"""CRUD operations for Class, StudentClass, and TutorClass.

- create_class (create a new class entry)
- get_class_by_id
- list_classes (with optional subject/professor filters)
- add_student_class (enroll student in a class)
- get_student_classes_by_student_id
- delete_student_class
- add_tutor_class (tutor declares they can teach a class)
- get_tutor_classes_by_tutor_id
- delete_tutor_class
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Class, StudentClass, TutorClass, StudentProfile, TutorProfile
from app.schemas import ClassCreate, StudentClassCreate, TutorClassCreate


# ==========================
# Class CRUD
# ==========================

def create_class(db: Session, data: ClassCreate) -> Class:
    """Create a new class."""
    # Check if class already exists
    existing = db.execute(
        select(Class).where(
            Class.subject == data.subject.upper(),
            Class.class_number == data.class_number,
            Class.professor == data.professor,
        )
    ).scalar_one_or_none()
    
    if existing:
        raise ValueError("Class already exists")
    
    class_ = Class(
        subject=data.subject.upper(),
        class_number=data.class_number,
        professor=data.professor,
    )
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


def get_class_by_id(db: Session, class_id: int) -> Optional[Class]:
    """Get a class by ID."""
    return db.get(Class, class_id)


def get_or_create_class(db: Session, subject: str, class_number: int, professor: str = "TBD") -> Class:
    """Get an existing class or create it if it doesn't exist."""
    existing = db.execute(
        select(Class).where(
            Class.subject == subject.upper(),
            Class.class_number == class_number,
        )
    ).scalar_one_or_none()
    
    if existing:
        return existing
    
    class_ = Class(
        subject=subject.upper(),
        class_number=class_number,
        professor=professor,
    )
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


def list_classes(
    db: Session,
    subject: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Class]:
    """List classes with optional filters."""
    stmt = select(Class)
    
    if subject:
        stmt = stmt.where(Class.subject == subject.upper())
    
    stmt = stmt.order_by(Class.subject, Class.class_number).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


# ==========================
# StudentClass CRUD
# ==========================

def add_student_class(db: Session, student_id: int, data: StudentClassCreate) -> StudentClass:
    """Enroll a student in a class."""
    # Verify class exists
    class_ = get_class_by_id(db, data.class_id)
    if not class_:
        raise ValueError("Class not found")
    
    # Check for duplicate enrollment
    existing = db.execute(
        select(StudentClass).where(
            StudentClass.student_id == student_id,
            StudentClass.class_id == data.class_id,
        )
    ).scalar_one_or_none()
    
    if existing:
        raise ValueError("Already enrolled in this class")
    
    student_class = StudentClass(
        student_id=student_id,
        class_id=data.class_id,
        help_level=data.help_level,
        estimated_grade=data.estimated_grade,
    )
    db.add(student_class)
    db.commit()
    db.refresh(student_class)
    return student_class


def get_student_classes_by_student_id(db: Session, student_id: int) -> List[StudentClass]:
    """Get all classes a student is enrolled in."""
    stmt = select(StudentClass).where(StudentClass.student_id == student_id)
    return list(db.execute(stmt).scalars().all())


def delete_student_class(db: Session, student_class: StudentClass) -> None:
    """Remove a student's class enrollment."""
    db.delete(student_class)
    db.commit()


def get_student_class_by_id(db: Session, student_class_id: int) -> Optional[StudentClass]:
    """Get a student class by ID."""
    return db.get(StudentClass, student_class_id)


# ==========================
# TutorClass CRUD
# ==========================

def add_tutor_class(db: Session, tutor_id: int, data: TutorClassCreate) -> TutorClass:
    """Add a class that a tutor can teach."""
    # Verify class exists
    class_ = get_class_by_id(db, data.class_id)
    if not class_:
        raise ValueError("Class not found")
    
    # Check for duplicate
    existing = db.execute(
        select(TutorClass).where(
            TutorClass.tutor_id == tutor_id,
            TutorClass.class_id == data.class_id,
        )
    ).scalar_one_or_none()
    
    if existing:
        raise ValueError("Already registered to tutor this class")
    
    tutor_class = TutorClass(
        tutor_id=tutor_id,
        class_id=data.class_id,
        semester=data.semester,
        year_taken=data.year_taken,
        grade_received=data.grade_received,
    )
    db.add(tutor_class)
    db.commit()
    db.refresh(tutor_class)
    return tutor_class


def get_tutor_classes_by_tutor_id(db: Session, tutor_id: int) -> List[TutorClass]:
    """Get all classes a tutor can teach."""
    stmt = select(TutorClass).where(TutorClass.tutor_id == tutor_id)
    return list(db.execute(stmt).scalars().all())


def delete_tutor_class(db: Session, tutor_class: TutorClass) -> None:
    """Remove a tutor's class entry."""
    db.delete(tutor_class)
    db.commit()


def get_tutor_class_by_id(db: Session, tutor_class_id: int) -> Optional[TutorClass]:
    """Get a tutor class by ID."""
    return db.get(TutorClass, tutor_class_id)
