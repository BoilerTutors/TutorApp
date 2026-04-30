"""add reviews.is_flagged and reviews.flag_reason

Revision ID: j1k2l3m4n5o6
Revises: f4c1b7a9d2e3
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op


revision: str = "j1k2l3m4n5o6"
down_revision: Union[str, Sequence[str], None] = "f4c1b7a9d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.reviews
        ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;
        """
    )
    op.execute(
        """
        ALTER TABLE public.reviews
        ADD COLUMN IF NOT EXISTS flag_reason TEXT NULL;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.reviews DROP COLUMN IF EXISTS flag_reason;")
    op.execute("ALTER TABLE public.reviews DROP COLUMN IF EXISTS is_flagged;")
