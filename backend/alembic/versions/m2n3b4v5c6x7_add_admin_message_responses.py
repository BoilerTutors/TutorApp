"""add admin message response fields

Revision ID: m2n3b4v5c6x7
Revises: s7t8r9i0p1e2
Create Date: 2026-04-30 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m2n3b4v5c6x7"
down_revision: Union[str, Sequence[str], None] = "s7t8r9i0p1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("admin_messages", sa.Column("admin_response", sa.Text(), nullable=True))
    op.add_column("admin_messages", sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("admin_messages", "responded_at")
    op.drop_column("admin_messages", "admin_response")
