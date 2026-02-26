from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy.orm import Session

from app.models import StudentProfile, TutorProfile, UserEmbedding
from app.services.embeddings import embed_text, join_list

EMBED_MODEL_NAME = "local-hash-v1"


def upsert_user_embedding(
    db: Session,
    *,
    user_id: int,
    entity_type: str,
    field_name: str,
    embedding: Sequence[float],
    model_name: str = EMBED_MODEL_NAME,
) -> UserEmbedding:
    row = (
        db.query(UserEmbedding)
        .filter(
            UserEmbedding.user_id == user_id,
            UserEmbedding.entity_type == entity_type,
            UserEmbedding.field_name == field_name,
            UserEmbedding.model_name == model_name,
        )
        .first()
    )
    now = datetime.now(timezone.utc)
    values = list(embedding)

    if row is None:
        row = UserEmbedding(
            user_id=user_id,
            entity_type=entity_type,
            field_name=field_name,
            model_name=model_name,
            embedding=values,
            updated_at=now,
        )
        db.add(row)
    else:
        row.embedding = values
        row.updated_at = now

    db.flush()
    return row


def refresh_tutor_embeddings(db: Session, tutor: TutorProfile) -> None:
    upsert_user_embedding(
        db,
        user_id=tutor.user_id,
        entity_type="tutor",
        field_name="bio",
        embedding=embed_text(tutor.bio or ""),
    )
    upsert_user_embedding(
        db,
        user_id=tutor.user_id,
        entity_type="tutor",
        field_name="help",
        embedding=embed_text(join_list(tutor.help_provided)),
    )
    upsert_user_embedding(
        db,
        user_id=tutor.user_id,
        entity_type="tutor",
        field_name="locations",
        embedding=embed_text(join_list(tutor.preferred_locations)),
    )


def refresh_student_embeddings(db: Session, student: StudentProfile) -> None:
    upsert_user_embedding(
        db,
        user_id=student.user_id,
        entity_type="student",
        field_name="bio",
        embedding=embed_text(student.bio or ""),
    )
    upsert_user_embedding(
        db,
        user_id=student.user_id,
        entity_type="student",
        field_name="help",
        embedding=embed_text(join_list(student.help_needed)),
    )
    upsert_user_embedding(
        db,
        user_id=student.user_id,
        entity_type="student",
        field_name="locations",
        embedding=embed_text(join_list(student.preferred_locations)),
    )
