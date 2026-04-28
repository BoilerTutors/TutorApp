"""add tutors.max_sessions_per_week

Revision ID: h9i0j1k2l3m4
Revises: g7h8i9j0k1l2
Create Date: 2026-04-02 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "h9i0j1k2l3m4"
down_revision: Union[str, Sequence[str], None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutors
        ADD COLUMN IF NOT EXISTS max_sessions_per_week INTEGER NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE public.tutors
        ADD CONSTRAINT ck_tutors_max_sessions_per_week_range
        CHECK (
            max_sessions_per_week IS NULL
            OR (max_sessions_per_week >= 1 AND max_sessions_per_week <= 168)
        )
        NOT VALID;
        """
    )
    op.execute(
        "ALTER TABLE public.tutors VALIDATE CONSTRAINT ck_tutors_max_sessions_per_week_range;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE public.tutors DROP CONSTRAINT IF EXISTS ck_tutors_max_sessions_per_week_range;"
    )
    op.execute(
        "ALTER TABLE public.tutors DROP COLUMN IF EXISTS max_sessions_per_week;"
    )
