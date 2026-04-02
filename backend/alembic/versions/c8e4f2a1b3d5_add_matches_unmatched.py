"""add matches.unmatched column

Revision ID: c8e4f2a1b3d5
Revises: b2c3d4e5f6a7
Create Date: 2026-04-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c8e4f2a1b3d5"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.matches
        ADD COLUMN IF NOT EXISTS unmatched BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.matches DROP COLUMN IF EXISTS unmatched;")
