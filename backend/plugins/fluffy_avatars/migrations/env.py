"""This plugin's Alembic environment: the shared body, its own version table."""

from app.core.plugin_migrations import run_env

run_env("fluffy-avatars")
