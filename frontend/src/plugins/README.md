# Frontend plugins

Everything a deployment adds to the console without editing it. Core reads the
four lists in this folder and nothing else here, so a folder that is not listed
is not loaded, and an upstream update never touches a plugin's files.

| File         | Lists                                                                                                                     | Read by                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `index.ts`   | each plugin's manifest (`FrontendPlugin`): catalogs, message rewrites, brand                                              | `src/lib/plugins.ts`      |
| `locales.ts` | locale rows (`LocaleMeta`) and the core codes hidden (`HIDDEN_LOCALES`) - plain data, because `next.config.ts` reads them | `src/lib/locales.ts`      |
| `slots.ts`   | components that replace or extend a named place in the console                                                            | `src/lib/plugin-slots.ts` |
| `styles.css` | stylesheets: fonts, a locale's typography                                                                                 | `src/app/layout.tsx`      |

A plugin is a folder, `src/plugins/<id>/`, with the same id as its backend half
in `backend/plugins/<id>/`. The full guide - the slots, the backend hooks,
migrations and how updating from upstream works - is `PLUGINS.md` at the repository root.
