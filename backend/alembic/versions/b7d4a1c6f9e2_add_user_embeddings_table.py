"""add user embeddings table

Revision ID: b7d4a1c6f9e2
Revises: 9f2d7f6d8a1b
Create Date: 2026-02-26 12:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7d4a1c6f9e2"
down_revision: Union[str, Sequence[str], None] = "9f2d7f6d8a1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_embeddings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=16), nullable=False),
        sa.Column("field_name", sa.String(length=32), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("entity_type IN ('student', 'tutor')", name="ck_embedding_entity"),
        sa.CheckConstraint("field_name IN ('bio', 'help', 'locations')", name="ck_embedding_field"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "entity_type",
            "field_name",
            "model_name",
            name="uq_user_embedding_slot",
        ),
    )
    op.create_index(op.f("ix_user_embeddings_id"), "user_embeddings", ["id"], unique=False)
    op.create_index(op.f("ix_user_embeddings_user_id"), "user_embeddings", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_user_embeddings_user_id"), table_name="user_embeddings")
    op.drop_index(op.f("ix_user_embeddings_id"), table_name="user_embeddings")
    op.drop_table("user_embeddings")
