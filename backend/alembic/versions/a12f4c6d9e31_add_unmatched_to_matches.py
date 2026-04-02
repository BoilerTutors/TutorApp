"""add unmatched to matches

Revision ID: a12f4c6d9e31
Revises: 927a68287367
Create Date: 2026-04-02 14:25:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a12f4c6d9e31"
down_revision: Union[str, Sequence[str], None] = "927a68287367"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        ALTER TABLE matches
        ADD COLUMN IF NOT EXISTS unmatched BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        ALTER TABLE matches
        DROP COLUMN IF EXISTS unmatched;
        """
    )

