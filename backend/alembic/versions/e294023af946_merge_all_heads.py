"""merge all heads

Revision ID: e294023af946
Revises: a12f4c6d9e31, add_tutor_reports, b2c3d4e5f6a7
Create Date: 2026-04-02 15:53:53.104105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e294023af946'
down_revision: Union[str, Sequence[str], None] = ('a12f4c6d9e31', 'add_tutor_reports', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
