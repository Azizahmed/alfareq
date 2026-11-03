"""Backend plugins: what a deployment adds without editing the platform.

A plugin is a package under `backend/plugins/<name>/` whose `plugin.py` defines
`PLUGIN`, a `BackendPlugin`. Every such package is discovered and loaded unless
`PLUGINS_DISABLED` names its id; core never imports a plugin by name, so a
deployment with no plugins is the upstream platform exactly, and an upstream
update never touches a plugin's files.

`plugin.py` is read at import time by modules low in the import graph (the user
schema reads the locale list), so it must stay plain data: everything heavy -
the router, the ORM metadata - is named by a dotted path and imported only when
it is used. A `plugin.py` that imported a route module would import the API
layer from inside `app.schemas`, which is a cycle.

What a plugin may contribute, and where core reads it:

| Field | Read by |
|---|---|
| `router` | `app.main.create_app`, mounted at `/api/v1/plugins/<id>` |
| `locales`, `language_names` | `ConsoleLocale`, the person briefing |
| `strings` | the locale tables of server-written text (welcome, briefing, voice) |
| `brand_name` | the deployment's built-in name, under an administrator's override |
| `migrations`, `metadata`, `tables` | `agenticos db upgrade`, and `alembic check` |

A plugin's migrations are its own Alembic history with its own version table,
`alembic_version_<id>`, so they never become a second head in the platform's
chain - which is what `tests/test_migration_chain.py` holds to one head - and
an upstream migration never has to be rebased onto a plugin's.
"""

import importlib
import logging
import pkgutil
from collections.abc import Mapping
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from types import ModuleType

from fastapi import APIRouter
from sqlalchemy import MetaData

from app.core.config import settings
from app.core.exceptions import ConfigurationError

logger = logging.getLogger(__name__)

PLUGINS_PACKAGE = "plugins"
"""The top-level package plugins live in: `backend/plugins/`."""

CORE_LOCALES: tuple[str, ...] = ("en", "pl", "de")
"""The console's own languages; a plugin's are appended after them."""


@dataclass(frozen=True, slots=True)
class BackendPlugin:
    """One plugin's contributions. Every field but `id` is optional."""

    id: str
    """Kebab-case, the same as the frontend half's folder: `fluffy-avatars`."""

    router: str | None = None
    """`module:attribute` of an `APIRouter`, mounted at `/api/v1/plugins/<id>`."""

    locales: tuple[str, ...] = ()
    """Console languages this plugin adds; their catalogs ship in the frontend half."""

    language_names: Mapping[str, str] = field(default_factory=dict)
    """A language's name as a model reads it best, per locale code: `{"ar": "Arabic"}`."""

    strings: Mapping[str, Mapping[str, str]] = field(default_factory=dict)
    """Server-written text per table key and locale: `{"voice.preview": {"ar": "..."}}`."""

    brand_name: str | None = None
    """The deployment's built-in name; an administrator's override still wins."""

    migrations: Path | None = None
    """An Alembic script directory, run against `alembic_version_<id>`."""

    metadata: str | None = None
    """`module:attribute` of the `MetaData` the plugin's tables are declared on."""

    tables: frozenset[str] = frozenset()
    """Tables the plugin's migrations own, which the platform's `alembic check` skips."""

    @property
    def version_table(self) -> str:
        """The plugin's own Alembic version table."""
        return f"alembic_version_{self.id.replace('-', '_')}"


class PluginError(ConfigurationError):
    """A plugin that cannot be loaded: a refusal at startup, not a silent skip."""

    message = "A plugin could not be loaded"
    code = "PLUGIN_ERROR"


def _load(module: ModuleType, name: str) -> BackendPlugin:
    plugin = getattr(module, "PLUGIN", None)
    if not isinstance(plugin, BackendPlugin):
        raise PluginError(
            message="A plugin's plugin.py must define PLUGIN as a BackendPlugin",
            details={"package": name},
        )
    return plugin


@cache
def installed_plugins() -> tuple[BackendPlugin, ...]:
    """Every plugin under `backend/plugins/` that `PLUGINS_DISABLED` does not name.

    Sorted by package name, so the order a rewrite or a string override applies
    in does not depend on the filesystem.
    """
    try:
        package = importlib.import_module(PLUGINS_PACKAGE)
    except ModuleNotFoundError:
        return ()
    disabled = set(settings.PLUGINS_DISABLED)
    found: list[BackendPlugin] = []
    for info in sorted(pkgutil.iter_modules(package.__path__), key=lambda module: module.name):
        if not info.ispkg:
            continue
        name = f"{PLUGINS_PACKAGE}.{info.name}"
        try:
            module = importlib.import_module(f"{name}.plugin")
        except ModuleNotFoundError as exc:
            if exc.name != f"{name}.plugin":
                raise
            continue
        plugin = _load(module, name)
        if plugin.id in disabled:
            logger.info("plugin_disabled", extra={"plugin": plugin.id})
            continue
        found.append(plugin)
    ids = [plugin.id for plugin in found]
    if len(ids) != len(set(ids)):
        raise PluginError(
            message="Two plugins declare the same id", details={"ids": ", ".join(ids)}
        )
    return tuple(found)


def resolve(path: str) -> object:
    """Import `module:attribute`, the way a plugin names its heavy parts."""
    module_name, _, attribute = path.partition(":")
    return getattr(importlib.import_module(module_name), attribute)


def plugin_routers() -> list[tuple[str, APIRouter]]:
    """Each plugin's router with the prefix it is mounted under."""
    routers: list[tuple[str, APIRouter]] = []
    for plugin in installed_plugins():
        if plugin.router is None:
            continue
        router = resolve(plugin.router)
        if not isinstance(router, APIRouter):
            raise PluginError(
                message="A plugin's router must name an APIRouter",
                details={"plugin": plugin.id, "router": plugin.router},
            )
        routers.append((f"/plugins/{plugin.id}", router))
    return routers


def console_locales() -> tuple[str, ...]:
    """The console's languages: the core three, then each plugin's."""
    extra = [code for plugin in installed_plugins() for code in plugin.locales]
    return CORE_LOCALES + tuple(code for code in extra if code not in CORE_LOCALES)


def language_names(base: Mapping[str, str]) -> dict[str, str]:
    """`base` with each plugin's language names laid over it."""
    names = dict(base)
    for plugin in installed_plugins():
        names.update(plugin.language_names)
    return names


def with_plugin_strings(key: str, base: Mapping[str, str]) -> dict[str, str]:
    """A locale table of server-written text, with each plugin's translations of `key` added."""
    table = dict(base)
    for plugin in installed_plugins():
        table.update(plugin.strings.get(key, {}))
    return table


def default_app_name() -> str:
    """The deployment's built-in name: the last brand plugin's, else `PROJECT_NAME`."""
    names = [plugin.brand_name for plugin in installed_plugins() if plugin.brand_name]
    return names[-1] if names else settings.PROJECT_NAME


def plugin_tables() -> frozenset[str]:
    """Every table a plugin owns: its migrations' tables and its own version table."""
    owned: set[str] = set()
    for plugin in installed_plugins():
        owned |= plugin.tables
        if plugin.migrations is not None:
            owned.add(plugin.version_table)
    return frozenset(owned)


def plugin_metadata(plugin: BackendPlugin) -> MetaData | None:
    """The `MetaData` a plugin's tables are declared on, for its autogenerate."""
    if plugin.metadata is None:
        return None
    metadata = resolve(plugin.metadata)
    if not isinstance(metadata, MetaData):
        raise PluginError(
            message="A plugin's metadata must name a SQLAlchemy MetaData",
            details={"plugin": plugin.id, "metadata": plugin.metadata},
        )
    return metadata


def plugin_by_id(plugin_id: str) -> BackendPlugin:
    """The installed plugin with this id, or a refusal naming the ones there are."""
    for plugin in installed_plugins():
        if plugin.id == plugin_id:
            return plugin
    raise PluginError(
        message="No installed plugin has this id",
        details={"plugin": plugin_id, "installed": ", ".join(p.id for p in installed_plugins())},
    )
