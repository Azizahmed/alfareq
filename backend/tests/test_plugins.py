"""The plugin loader and plugin migrations: `app/core/plugins.py`, `app/core/plugin_migrations.py`.

Discovery is tested against packages written into a temporary directory, so the
cases a real deployment would only meet by accident - a plugin with no
`plugin.py`, a broken import inside one, two plugins claiming one id - are each
one fixture away. Everything downstream of discovery is tested against plugins
handed in directly.
"""

import sys
import textwrap
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest
from fastapi import APIRouter
from sqlalchemy import MetaData

from app.core import plugin_migrations, plugins
from app.core.config import settings
from app.core.plugins import BackendPlugin, PluginError

ROUTER = APIRouter()
METADATA = MetaData()
NOT_A_ROUTER = object()


@pytest.fixture
def fresh_cache() -> Iterator[None]:
    plugins.installed_plugins.cache_clear()
    yield
    plugins.installed_plugins.cache_clear()


@pytest.fixture
def package(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, fresh_cache: None) -> Path:
    """An empty plugins package, importable, that discovery reads instead of `plugins`."""
    name = f"fake_plugins_{tmp_path.name}"
    root = tmp_path / name
    root.mkdir()
    (root / "__init__.py").write_text("")
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setattr(plugins, "PLUGINS_PACKAGE", name)
    yield root
    for module in [m for m in sys.modules if m == name or m.startswith(f"{name}.")]:
        del sys.modules[module]


def add_plugin(root: Path, folder: str, body: str | None) -> None:
    """A plugin package; `body` is its `plugin.py`, or None for a package without one."""
    pkg = root / folder
    pkg.mkdir()
    (pkg / "__init__.py").write_text("")
    if body is not None:
        (pkg / "plugin.py").write_text(textwrap.dedent(body))


def declaring(plugin_id: str) -> str:
    return f'from app.core.plugins import BackendPlugin\nPLUGIN = BackendPlugin(id="{plugin_id}")\n'


@contextmanager
def installed(monkeypatch: pytest.MonkeyPatch, *found: BackendPlugin) -> Iterator[None]:
    monkeypatch.setattr(plugins, "installed_plugins", lambda: found)
    monkeypatch.setattr(plugin_migrations, "installed_plugins", lambda: found)
    yield


class TestDiscovery:
    def test_no_plugins_package_means_no_plugins(
        self, monkeypatch: pytest.MonkeyPatch, fresh_cache: None
    ) -> None:
        monkeypatch.setattr(plugins, "PLUGINS_PACKAGE", "no_such_plugins_package")
        assert plugins.installed_plugins() == ()

    def test_every_package_with_a_plugin_py_loads_in_name_order(self, package: Path) -> None:
        add_plugin(package, "zeta", declaring("zeta"))
        add_plugin(package, "alpha", declaring("alpha"))
        add_plugin(package, "helpers", None)
        (package / "loose_module.py").write_text("")

        assert [plugin.id for plugin in plugins.installed_plugins()] == ["alpha", "zeta"]

    def test_a_disabled_plugin_is_not_loaded(
        self, package: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        add_plugin(package, "kept", declaring("kept"))
        add_plugin(package, "dropped", declaring("dropped"))
        monkeypatch.setattr(settings, "PLUGINS_DISABLED", ["dropped"])

        assert [plugin.id for plugin in plugins.installed_plugins()] == ["kept"]

    def test_a_broken_import_inside_a_plugin_is_not_mistaken_for_no_plugin(
        self, package: Path
    ) -> None:
        add_plugin(package, "broken", "import a_module_nobody_installed\n")

        with pytest.raises(ModuleNotFoundError, match="a_module_nobody_installed"):
            plugins.installed_plugins()

    def test_a_plugin_py_without_a_plugin_is_refused(self, package: Path) -> None:
        add_plugin(package, "empty", "PLUGIN = {'id': 'empty'}\n")

        with pytest.raises(PluginError) as refused:
            plugins.installed_plugins()
        assert refused.value.details == {"package": f"{package.name}.empty"}

    def test_two_plugins_with_one_id_are_refused(self, package: Path) -> None:
        add_plugin(package, "one", declaring("same"))
        add_plugin(package, "two", declaring("same"))

        with pytest.raises(PluginError, match="same id"):
            plugins.installed_plugins()

    def test_the_repositorys_own_plugins_load(self, fresh_cache: None) -> None:
        ids = {plugin.id for plugin in plugins.installed_plugins()}
        assert {"arabic", "alfareq-brand", "fluffy-avatars"} <= ids


class TestContributions:
    def test_routers_mount_under_their_plugins_id(self, monkeypatch: pytest.MonkeyPatch) -> None:
        with installed(
            monkeypatch,
            BackendPlugin(id="quiet"),
            BackendPlugin(id="loud", router="tests.test_plugins:ROUTER"),
        ):
            assert plugins.plugin_routers() == [("/plugins/loud", ROUTER)]

    def test_a_router_that_is_not_one_is_refused(self, monkeypatch: pytest.MonkeyPatch) -> None:
        with (
            installed(
                monkeypatch, BackendPlugin(id="odd", router="tests.test_plugins:NOT_A_ROUTER")
            ),
            pytest.raises(PluginError, match="APIRouter"),
        ):
            plugins.plugin_routers()

    def test_locales_follow_the_core_three_once_each(self, monkeypatch: pytest.MonkeyPatch) -> None:
        with installed(
            monkeypatch,
            BackendPlugin(id="a", locales=("ar", "de")),
            BackendPlugin(id="b", locales=("fa",)),
        ):
            assert plugins.console_locales() == ("en", "pl", "de", "ar", "fa")

    def test_language_names_and_strings_lay_over_the_base(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        with installed(
            monkeypatch,
            BackendPlugin(
                id="a",
                language_names={"ar": "Arabic"},
                strings={"greeting": {"ar": "أهلًا"}},
            ),
        ):
            assert plugins.language_names({"en": "English"}) == {"en": "English", "ar": "Arabic"}
            assert plugins.with_plugin_strings("greeting", {"en": "Hi"}) == {
                "en": "Hi",
                "ar": "أهلًا",
            }
            assert plugins.with_plugin_strings("other", {"en": "Bye"}) == {"en": "Bye"}

    def test_the_built_in_name_is_the_last_brand_plugins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        with installed(monkeypatch):
            assert plugins.default_app_name() == settings.PROJECT_NAME
        with installed(
            monkeypatch,
            BackendPlugin(id="a", brand_name="First"),
            BackendPlugin(id="b"),
            BackendPlugin(id="c", brand_name="Last"),
        ):
            assert plugins.default_app_name() == "Last"

    def test_tables_metadata_and_lookup(self, monkeypatch: pytest.MonkeyPatch) -> None:
        owner = BackendPlugin(
            id="has-tables",
            metadata="tests.test_plugins:METADATA",
            tables=frozenset({"plugin_rows"}),
        )
        wrong = BackendPlugin(id="wrong", metadata="tests.test_plugins:ROUTER")
        with installed(monkeypatch, owner, wrong):
            assert plugins.plugin_tables() == frozenset({"plugin_rows"})
            assert plugins.plugin_metadata(owner) is METADATA
            assert plugins.plugin_metadata(BackendPlugin(id="none")) is None
            with pytest.raises(PluginError, match="MetaData"):
                plugins.plugin_metadata(wrong)
            assert plugins.plugin_by_id("has-tables") is owner
            with pytest.raises(PluginError) as missing:
                plugins.plugin_by_id("absent")
            assert missing.value.details == {"plugin": "absent", "installed": "has-tables, wrong"}

    def test_a_plugin_with_migrations_owns_its_version_table(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        with installed(monkeypatch, BackendPlugin(id="migrated", migrations=Path("m"))):
            assert plugins.plugin_tables() == frozenset({"alembic_version_migrated"})

    def test_a_plugins_version_table_is_its_own(self) -> None:
        assert BackendPlugin(id="fluffy-avatars").version_table == "alembic_version_fluffy_avatars"


class TestPluginMigrations:
    def test_a_plugin_without_migrations_has_no_config(self) -> None:
        with pytest.raises(PluginError, match="no migrations"):
            plugin_migrations.plugin_alembic_config(BackendPlugin(id="bare"))

    def test_the_config_points_at_the_plugins_scripts(self, tmp_path: Path) -> None:
        config = plugin_migrations.plugin_alembic_config(
            BackendPlugin(id="rows", migrations=tmp_path)
        )
        assert config.get_main_option("script_location") == str(tmp_path)
        assert config.attributes["plugin_id"] == "rows"

    def test_upgrade_runs_each_plugin_with_migrations(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        upgraded: list[tuple[str | None, str]] = []
        monkeypatch.setattr(
            plugin_migrations.command,
            "upgrade",
            lambda config, revision: upgraded.append(
                (config.get_main_option("script_location"), revision)
            ),
        )
        with installed(
            monkeypatch,
            BackendPlugin(id="bare"),
            BackendPlugin(id="rows", migrations=tmp_path),
        ):
            assert plugin_migrations.upgrade_plugins() == ["rows"]
        assert upgraded == [(str(tmp_path), "head")]

    def test_the_env_runs_against_the_plugins_version_table_and_tables_only(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        plugin = BackendPlugin(
            id="rows",
            metadata="tests.test_plugins:METADATA",
            tables=frozenset({"plugin_rows"}),
        )
        configured: dict[str, Any] = {}
        ran: list[str] = []

        class Connection:
            def __enter__(self) -> Connection:
                return self

            def __exit__(self, *exc: object) -> None:
                ran.append("closed")

        class Engine:
            def connect(self) -> Connection:
                return Connection()

        class Transaction:
            def __enter__(self) -> None:
                ran.append("begun")

            def __exit__(self, *exc: object) -> None:
                ran.append("committed")

        monkeypatch.setattr(plugin_migrations, "plugin_by_id", lambda plugin_id: plugin)
        monkeypatch.setattr(plugin_migrations, "engine_from_config", lambda *a, **k: Engine())
        monkeypatch.setattr(
            plugin_migrations.context, "configure", configured.update, raising=False
        )
        monkeypatch.setattr(
            plugin_migrations.context, "begin_transaction", Transaction, raising=False
        )
        monkeypatch.setattr(
            plugin_migrations.context,
            "run_migrations",
            lambda: ran.append("migrated"),
            raising=False,
        )

        plugin_migrations.run_env("rows")

        assert configured["version_table"] == "alembic_version_rows"
        assert configured["target_metadata"] is METADATA
        include = configured["include_name"]
        assert include("plugin_rows", "table", {}) is True
        assert include("agents", "table", {}) is False
        assert include("id", "column", {}) is True
        assert include("plugin_rows_agent_id_fkey", "foreign_key_constraint", {}) is False
        assert ran == ["begun", "migrated", "committed", "closed"]
