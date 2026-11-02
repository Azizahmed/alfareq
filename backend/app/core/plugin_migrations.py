"""Running a plugin's own Alembic history.

Each plugin with tables keeps an Alembic script directory of its own and records
where it is in `alembic_version_<id>`, beside the platform's `alembic_version`.
The two histories never meet: the platform's chain keeps exactly one head, an
upstream migration needs no rebase onto a plugin's, and removing a plugin leaves
the platform's history as upstream wrote it.

A plugin migration may reference platform tables (a foreign key to `agents`),
so plugins upgrade after the platform does - `agenticos db upgrade` runs both,
in that order.
"""

from collections.abc import MutableMapping
from typing import Literal

from alembic.config import Config
from sqlalchemy import engine_from_config, pool

from alembic import command, context
from app.core.config import settings
from app.core.plugins import (
    BackendPlugin,
    PluginError,
    installed_plugins,
    plugin_by_id,
    plugin_metadata,
)


def plugin_alembic_config(plugin: BackendPlugin) -> Config:
    """An Alembic config pointed at the plugin's script directory."""
    if plugin.migrations is None:
        raise PluginError(message="This plugin has no migrations", details={"plugin": plugin.id})
    config = Config()
    config.set_main_option("script_location", str(plugin.migrations))
    config.attributes["plugin_id"] = plugin.id
    return config


def upgrade_plugins(revision: str = "head") -> list[str]:
    """Upgrade every installed plugin's tables; returns the ids it ran."""
    ran: list[str] = []
    for plugin in installed_plugins():
        if plugin.migrations is None:
            continue
        command.upgrade(plugin_alembic_config(plugin), revision)
        ran.append(plugin.id)
    return ran


def run_env(plugin_id: str) -> None:
    """The body of a plugin's `migrations/env.py`.

    Online only: a plugin's tables are created where the platform's already are,
    so there is no offline SQL script to render for them separately.
    """
    plugin = plugin_by_id(plugin_id)
    owned = plugin.tables

    def include_name(
        name: str | None,
        type_: Literal[
            "schema",
            "table",
            "column",
            "index",
            "unique_constraint",
            "foreign_key_constraint",
            "check_constraint",
        ],
        parent_names: MutableMapping[
            Literal["schema_name", "table_name", "schema_qualified_table_name"], str | None
        ],
    ) -> bool:
        # Signature fixed by Alembic; `parent_names` is unused.
        del parent_names
        # A foreign key into a platform table is written by hand in the migration:
        # this metadata does not hold `agents`, so it cannot declare one, and
        # autogenerate would otherwise offer to drop every such key it finds.
        if type_ == "foreign_key_constraint":
            return False
        return type_ != "table" or name in owned

    connectable = engine_from_config(
        {"sqlalchemy.url": settings.DATABASE_URL_SYNC},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=plugin_metadata(plugin),
            version_table=plugin.version_table,
            include_name=include_name,
        )
        with context.begin_transaction():
            context.run_migrations()
