"""merge all heads

Revision ID: e294023af946
Revises: 7a1d2c3e4f5a, 8b7c6d5e4f3a, c8d9e0f1a2b3
Create Date: 2026-04-29

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "e294023af946"
down_revision: Union[str, Sequence[str], None] = (
    "7a1d2c3e4f5a",
    "8b7c6d5e4f3a",
    "c8d9e0f1a2b3",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge revision with no schema changes."""
    pass


def downgrade() -> None:
    """Downgrade merge revision with no schema changes."""
    pass
