"""Rename the character `vila` to `vita`, as the studio spells it.

Revision ID: fluffy_avatars_0002
Revises: fluffy_avatars_0001
Create Date: 2026-11-03

A style is JSONB validated against `Character` on every read, so a row still
naming `vila` would fail the lookup for its agent. Only the one key changes.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "fluffy_avatars_0002"
down_revision: str | None = "fluffy_avatars_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _rename(old: str, new: str) -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE plugin_fluffy_avatars "
            "SET style = jsonb_set(style, '{character}', to_jsonb(CAST(:new AS text))) "
            "WHERE style->>'character' = :old"
        ),
        {"old": old, "new": new},
    )


def upgrade() -> None:
    _rename("vila", "vita")


def downgrade() -> None:
    _rename("vita", "vila")
