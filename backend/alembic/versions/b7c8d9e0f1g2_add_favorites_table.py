"""add favorites table

Revision ID: b7c8d9e0f1g2
Revises: a1b2c3d4e5f6
Create Date: 2026-04-30
"""
from typing import Sequence, Union
from alembic import op


revision: str = "b7c8d9e0f1g2"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.favorites (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            tutor_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_favorite_pair UNIQUE (student_id, tutor_id)
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_favorites_student_id ON public.favorites(student_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_favorites_tutor_id ON public.favorites(tutor_id);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.favorites;")