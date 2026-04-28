"""add students.max_hourly_rate_cents

Revision ID: f5a6b7c8d9e0
Revises: e3f4a5b6c7d8
Create Date: 2026-04-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.students
        ADD COLUMN IF NOT EXISTS max_hourly_rate_cents INTEGER NULL;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.students DROP COLUMN IF EXISTS max_hourly_rate_cents;")
