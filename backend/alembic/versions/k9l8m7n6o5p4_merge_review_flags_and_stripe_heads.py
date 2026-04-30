"""merge review-flag head (j1k2) with alternate stripe head (s7t8)

Revision ID: k9l8m7n6o5p4
Revises: j1k2l3m4n5o6, s7t8r9i0p1e2
Create Date: 2026-04-29

Resolves multiple Alembic heads so `alembic upgrade head` works again.
Schema changes from both parents are already idempotent where they overlap
(stripe_account_id, review flag columns).
"""
from typing import Sequence, Union


revision: str = "k9l8m7n6o5p4"
down_revision: Union[str, Sequence[str], None] = (
    "j1k2l3m4n5o6",
    "s7t8r9i0p1e2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
