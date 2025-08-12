"""make building_nickname nullable

Revision ID: 8e9f8a0bb19d
Revises: d3c21d25a673
Create Date: 2025-08-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8e9f8a0bb19d"
down_revision: Union[str, Sequence[str], None] = "d3c21d25a673"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: allow NULL for game_claim_buildings.building_nickname."""
    with op.batch_alter_table("game_claim_buildings", schema=None) as batch_op:
        batch_op.alter_column(
            "building_nickname",
            existing_type=sa.String(length=255),
            nullable=True,
        )


def downgrade() -> None:
    """Downgrade schema: revert to NOT NULL for building_nickname."""
    with op.batch_alter_table("game_claim_buildings", schema=None) as batch_op:
        batch_op.alter_column(
            "building_nickname",
            existing_type=sa.String(length=255),
            nullable=False,
        )


