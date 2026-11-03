"""Alfareq's name in the mail and messages the server writes itself.

The console's half (`frontend/src/plugins/alfareq-brand/`) carries the mark and
the Arabic spelling. An administrator who sets a name in `/admin/settings` still
overrides this one, as they override the platform's own.
"""

from app.core.plugins import BackendPlugin

PLUGIN = BackendPlugin(id="alfareq-brand", brand_name="Alfareq")
