"""add student bio

Revision ID: 9f2d7f6d8a1b
Revises: 6c05817e209e
Create Date: 2026-02-26 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9f2d7f6d8a1b"
down_revision: Union[str, Sequence[str], None] = "6c05817e209e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    IF NOT EXISTS: local DBs created with create_tables.py already have this column.
    """
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS bio TEXT;")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS bio;")
