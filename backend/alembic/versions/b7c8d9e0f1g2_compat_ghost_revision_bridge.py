"""compat bridge for legacy ghost revision id

Revision ID: b7c8d9e0f1g2
Revises: a12f4c6d9e31
Create Date: 2026-04-30 15:55:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1g2"
down_revision: Union[str, Sequence[str], None] = "a12f4c6d9e31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Legacy compatibility placeholder. No schema changes."""
    pass


def downgrade() -> None:
    """Legacy compatibility placeholder. No schema changes."""
    pass

