"""Seed the classes table with Purdue classes (matches frontend AVAILABLE_CLASSES_FALLBACK).

Run from backend/:
    python dev/seed_classes.py

Required for tutor registration and profile tutoring preferences to work -
TutorClass inserts reference classes.id via foreign key.
"""
from pathlib import Path
import sys

backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from sqlalchemy import text  # type: ignore[import]
from app.database import SessionLocal  # type: ignore  # noqa: E402
from app.models import Class  # type: ignore  # noqa: E402

# Same list as frontend constants/classes.ts AVAILABLE_CLASSES_FALLBACK
PURDUE_CLASSES = [
    (1, "CS", 180, "Problem Solving And Object-Oriented Programming"),
    (2, "CS", 182, "Foundations of Computer Science"),
    (3, "CS", 240, "Programming in C"),
    (4, "CS", 250, "Computer Architecture"),
    (5, "CS", 251, "Data Structures and Algorithms"),
    (6, "CS", 307, "Software Engineering I"),
    (7, "CS", 354, "Operating Systems"),
    (8, "CS", 373, "Data Mining & Machine Learning"),
    (9, "CS", 407, "Software Engineering II"),
    (10, "MA", 161, "Plane Analytic Geometry And Calculus I"),
    (11, "MA", 162, "Plane Analytic Geometry And Calculus II"),
    (12, "MA", 265, "Linear Algebra"),
    (13, "PHYS", 172, "Modern Mechanics"),
    (14, "PHYS", 272, "Electric and Magnetic Interactions"),
]


def main() -> None:
    with SessionLocal() as session:
        for cid, subject, class_number, professor in PURDUE_CLASSES:
            existing = session.get(Class, cid)
            if existing:
                continue
            session.add(
                Class(
                    id=cid,
                    subject=subject,
                    class_number=class_number,
                    professor=professor[:255],  # truncate if needed
                )
            )
        session.flush()
        # Reset sequence so next auto-insert gets 15
        session.execute(text("SELECT setval('classes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM classes))"))
        session.commit()
    print(f"Seeded {len(PURDUE_CLASSES)} classes into classes table.")


if __name__ == "__main__":
    main()
