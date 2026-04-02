"""repair empty migration script

Revision ID: c3f8a9d2e4b1
Revises: d4e5f6a7b8c9, e61c2a8d44be
Create Date: 2026-02-26 21:10:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "c3f8a9d2e4b1"
down_revision: Union[str, Sequence[str], None] = ("d4e5f6a7b8c9", "e61c2a8d44be")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
