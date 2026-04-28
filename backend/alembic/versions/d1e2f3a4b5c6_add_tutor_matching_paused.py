"""add tutors.matching_paused

Revision ID: d1e2f3a4b5c6
Revises: c8e4f2a1b3d5
Create Date: 2026-04-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c8e4f2a1b3d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutors
        ADD COLUMN IF NOT EXISTS matching_paused BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.tutors DROP COLUMN IF EXISTS matching_paused;")
