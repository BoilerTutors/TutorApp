"""add tutoring_sessions verification columns

Revision ID: g7h8i9j0k1l2
Revises: f5a6b7c8d9e0
Create Date: 2026-04-02 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, Sequence[str], None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutoring_sessions
        ADD COLUMN IF NOT EXISTS verification_code_hash VARCHAR(255) NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE public.tutoring_sessions
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.tutoring_sessions DROP COLUMN IF EXISTS is_verified;")
    op.execute("ALTER TABLE public.tutoring_sessions DROP COLUMN IF EXISTS verification_code_hash;")
