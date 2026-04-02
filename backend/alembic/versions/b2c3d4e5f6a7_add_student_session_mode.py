"""add student session_mode (merge alembic heads)

Revision ID: b2c3d4e5f6a7
Revises: e61c2a8d44be, d4e5f6a7b8c9
Create Date: 2026-03-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = ("e61c2a8d44be", "d4e5f6a7b8c9")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS session_mode VARCHAR(20) DEFAULT 'both';"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS session_mode;")
