"""merge alembic heads

Revision ID: f88881a2daae
Revises: d4e5f6a7b8c9, e61c2a8d44be
Create Date: 2026-04-02 12:45:22.448470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f88881a2daae'
down_revision: Union[str, Sequence[str], None] = ('d4e5f6a7b8c9', 'e61c2a8d44be')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
