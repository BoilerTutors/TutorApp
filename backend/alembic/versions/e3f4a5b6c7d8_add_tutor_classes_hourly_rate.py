"""add tutor_classes.hourly_rate_cents

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-04-02 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.tutor_classes
        ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER NULL;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.tutor_classes DROP COLUMN IF EXISTS hourly_rate_cents;")
