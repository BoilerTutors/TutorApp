"""merge user activity branch with legacy ghost branch

Revision ID: d6e7f8a9b0c1
Revises: c4d5e6f7a8b9, b7c8d9e0f1g2
Create Date: 2026-04-30 15:56:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = ("c4d5e6f7a8b9", "b7c8d9e0f1g2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge revision with no schema changes."""
    pass


def downgrade() -> None:
    """Downgrade merge revision with no schema changes."""
    pass

