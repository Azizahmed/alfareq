# Plugins

What this deployment adds to the platform without editing it - and how to keep
taking the platform's own updates while it does.

This file is read in the repository. It is not a page on the documentation
site: it describes this fork, not the product.

## Why plugins

The platform is updated upstream all the time. A deployment that edits its
files to add a language, a brand or a feature turns every update into a merge
with conflicts in the files it touched, and eventually into a fork nobody
updates. A plugin keeps the addition in a folder of its own, and the platform
reads it through a handful of stable places - the *seams*. Updating is then a
plain merge: upstream never edits a plugin's folder, and the seams change
rarely.

## Where a plugin lives

A plugin has up to two halves with the same id:

| Half | Folder | Discovered by |
|---|---|---|
| Backend | `backend/plugins/<name>/` (Python package, `plugin.py` defines `PLUGIN`) | `app/core/plugins.py`, automatically |
| Frontend | `frontend/src/plugins/<id>/` | the four lists in `frontend/src/plugins/` |

The backend half is loaded unless `PLUGINS_DISABLED` names it, for example
`PLUGINS_DISABLED='["fluffy-avatars"]'` in `backend/.env`. The frontend half is
loaded when it is listed; removing its line switches it off. Next.js has no
runtime discovery, so the console is rebuilt when a frontend plugin changes.

## What a plugin can do

### Backend (`BackendPlugin` in `app/core/plugins.py`)

| Field | Effect |
|---|---|
| `router` | `module:attribute` of an `APIRouter`, mounted at `/api/v1/plugins/<id>`. The console reaches it through `/api/plugins/...` |
| `locales`, `language_names` | Adds a console language: accepted as a person's locale, and named to agents in the person briefing |
| `strings` | Translations of the few sentences the server writes itself: `voice.preview`, `proactive.briefing.heading`, `.more`, `.open`, `proactive.welcome.greeting` |
| `brand_name` | The deployment's built-in name in mail and notifications. An administrator's name in `/admin/settings` still wins |
| `migrations`, `metadata`, `tables` | The plugin's own tables, in its own Alembic history and version table (`alembic_version_<id>`) |

`plugin.py` must stay plain data: it is read while the platform's schemas are
still importing, so the router and the ORM metadata are named by path and
imported only when used.

**Migrations.** A plugin's history never joins the platform's chain, which
`tests/test_migration_chain.py` holds to one head. `agenticos db upgrade` (what
the `migrate` service runs) upgrades the platform first, then every plugin, so a
plugin's foreign key into `agents` finds its table. The platform's
`alembic check` skips a plugin's tables and version table. To add a plugin
migration after changing its models:

```bash
cd backend && uv run agenticos db plugin-migrate --plugin <id> -m "what changed"
```

A plugin table uses its own `MetaData` (see `plugins/fluffy_avatars/models.py`),
never the platform's `Base`, and writes a foreign key into a platform table by
hand in the migration.

### Frontend (`FrontendPlugin` in `frontend/src/lib/plugins.ts`)

| List | Holds | Effect |
|---|---|---|
| `index.ts` | manifests | `catalogs` (a whole locale), `messages` (the plugin's own strings, under every locale), `rewriteMessages`, `brand` |
| `locales.ts` | `LocaleMeta` rows | A new language: label, flag, `dir`, Open Graph and date tags. `<html dir>` follows it |
| `slots.ts` | components | Fills a named place (`src/lib/plugin-slots.ts`) |
| `styles.css` | stylesheets | Imported after the console's own: fonts, a language's typography |

The slots are `agent-face` (the face an agent wears without an uploaded
picture) and `agent-avatar-tools` (controls beside the portrait on the agent
page). A slot is a contract - its props are what core promises - so one is added
only when a plugin needs it.

A plugin's English strings live in `<id>/messages/en.json`; `make lint` reads
them as part of the catalog, so they are held to the same rules as the
console's copy.

## Right to left

The console is written in logical properties (`ms-`, `pe-`, `start-`,
`text-start`, `rounded-s`, `border-s`), so a locale whose row says
`dir: "rtl"` mirrors it. `bun run check:rtl` (in `make lint-frontend`) refuses a
physical class; `rtl-exempt: <reason>` lets a genuinely physical one through.
Pointer maths that reads `clientX` asks `src/lib/direction.ts` which way the
element runs. The workflow canvas stays left to right.

## The plugins in this repository

| Plugin | Backend | Frontend |
|---|---|---|
| `arabic` | `ar` as a console language; Arabic welcome, briefing and voice preview | `ar.json`, IBM Plex Sans Arabic, RTL typography, mirrored arrows |
| `alfareq-brand` | Alfareq as the built-in name | Alfareq / الفريق per locale, the mark, the product's name in copy |
| `fluffy-avatars` | `plugin_fluffy_avatars` table, `/api/v1/plugins/fluffy-avatars` | Furry character avatars and the avatar studio on the agent page |

**Arabic.** The catalog is translated namespace by namespace;
`frontend/src/plugins/arabic/messages/ar.json` holds what is done, and anything
else renders in English. The product's own nouns stay English as the console's
convention requires (`.claude/rules/frontend.md`): agent, spec, capability,
skill, run, prompt, provider, token, vault, workspace, sandbox, MCP. English
remains the default locale; a person picks Arabic from the language menu.

**Alfareq.** The brand replaces the built-ins only. To change the name or logo
on a running deployment, use `/admin/settings` as upstream documents. The mark
is generated from `frontend/src/plugins/alfareq-brand/assets/alfareq-mark.svg`
with `bun run src/plugins/alfareq-brand/gen-mark.ts`; `assets/` also has the
wordmark as SVG and PNG for uploading elsewhere.

**Avatars.** Six characters (Nexo, Vita, Cloe, Malu, Yoshi, Fred), eleven
shapes, sixteen expressions plus each character's own, twelve colours, an eye
size, and seven states and five body transitions to preview them in. An agent with no stored style wears one derived from its handle. The
studio is the palette button beside the agent's portrait, for people who can
edit the agent; everyone who can see the agent sees the style. A picture
uploaded the platform's way still takes precedence.

## Updating from upstream

```bash
git remote add upstream https://github.com/vstorm-co/agenticos.git   # once
git fetch upstream
git merge upstream/main
```

Conflicts come from two places:

- **The seam files** - few, and each change in them small:
  - backend: `app/core/config.py` (`PLUGINS_DISABLED`), `app/main.py` (mounting
    routers), `app/schemas/user.py` and `app/schemas/voice.py` (`ConsoleLocale`),
    the four string tables (`agents/person_briefing.py`,
    `services/proactive/_briefing.py`, `_welcome.py`, `services/voice/preview.py`),
    `services/deployment_settings.py` and `services/notifications.py` (the
    built-in name), `alembic/env.py`, `cli/commands.py`, `pyproject.toml`
  - frontend: `src/lib/locales.ts`, `src/i18n.ts`, `src/lib/branding.ts`,
    `src/lib/branding-server.ts`, `src/lib/seo.ts`, `src/app/layout.tsx`,
    `src/app/[locale]/layout.tsx`, `src/components/agents/agent-avatar.tsx`, the
    agent page, `vitest.setup.ts`, `scripts/check-i18n.ts`
  - `docker-compose.override.yml` (mounting `backend/plugins` in dev) and the
    e2e migration step in `.github/workflows/ci.yml`
- **Components made right to left.** The console's direction classes are
  logical (`ms-`, `pe-`, `text-start`), so a component upstream changed conflicts
  even though only its classes differ here. Merging 1.38.1 hit 28 such files.

A file whose only difference here is its direction classes takes upstream's
version, and the RTL check writes the classes back:

```bash
git checkout --theirs -- <file>                # upstream's version
cd frontend && bun run check:rtl --fix         # physical classes -> logical
```

`--fix` skips any line an `rtl-exempt:` comment covers - a dialog centred with
`left-[50%]` stays centred. A file with other changes here (a slot, an exempt
dialog, an `rtl:` variant) is merged by hand.

After the merge:

```bash
cd frontend && bun run check:rtl --fix && bun install --frozen-lockfile
cd frontend && bunx vitest run src/plugins src/lib/plugins.test.ts
cd backend && uv run pytest plugins tests/test_plugins.py -q
```

The Arabic catalog test fails while any English message upstream added has no
Arabic translation: translate those into
`frontend/src/plugins/arabic/messages/ar.json` (and drop the keys upstream
removed) before merging. Then `agenticos db upgrade` applies the platform's
migrations and the plugins' after them.

The logical-properties change and the locale and slot seams are written to be
proposed upstream; once accepted there, these merges stop conflicting at all.

## Writing a new plugin

1. `backend/plugins/<name>/plugin.py` with `PLUGIN = BackendPlugin(id="<id>", ...)`,
   if it needs the server.
2. `frontend/src/plugins/<id>/manifest.ts` exporting a `FrontendPlugin`, and a
   line in `frontend/src/plugins/index.ts`; `slots.ts`, `locales.ts` and
   `styles.css` if it fills a slot, adds a language or ships CSS.
3. Tests beside it: `backend/plugins/<name>/tests/`, `frontend/src/plugins/<id>/*.test.ts`.
   The console's own tests run with every plugin list empty (`vitest.setup.ts`),
   as upstream ships, so they keep describing the upstream console.
