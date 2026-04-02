"""merge heads before schema drift check

Revision ID: c3f8a9d2e4b1
Revises: 6ec3778aedad, 55353b6f275c
Create Date: 2026-04-02 13:45:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "c3f8a9d2e4b1"
down_revision: Union[str, Sequence[str], None] = ("6ec3778aedad", "55353b6f275c")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""

