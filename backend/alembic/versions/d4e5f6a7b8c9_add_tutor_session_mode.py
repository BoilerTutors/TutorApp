"""add tutor session_mode

Revision ID: d4e5f6a7b8c9
Revises: c3b2d9a41e76
Create Date: 2026-02-26 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3b2d9a41e76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE tutors ADD COLUMN IF NOT EXISTS session_mode VARCHAR(20) DEFAULT 'both';"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE tutors DROP COLUMN IF EXISTS session_mode;")

