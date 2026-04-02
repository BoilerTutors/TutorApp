"""merge unmatched and student_session_mode heads

Revision ID: c8d9e0f1a2b3
Revises: a12f4c6d9e31, b2c3d4e5f6a7
Create Date: 2026-04-02 14:40:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = ("a12f4c6d9e31", "b2c3d4e5f6a7")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""

