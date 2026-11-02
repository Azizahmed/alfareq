"""The avatar studio's backend: one style row per agent that has one.

An agent without a row wears the face its handle derives, so nothing is stored
until somebody opens the studio. The row lives in a plugin table with its own
migrations (`migrations/`), never in `agents`.
"""

from pathlib import Path

from app.core.plugins import BackendPlugin

PLUGIN = BackendPlugin(
    id="fluffy-avatars",
    router="plugins.fluffy_avatars.routes:router",
    migrations=Path(__file__).parent / "migrations",
    metadata="plugins.fluffy_avatars.models:metadata",
    tables=frozenset({"plugin_fluffy_avatars"}),
)
