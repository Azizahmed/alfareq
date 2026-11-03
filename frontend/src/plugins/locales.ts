/**
 * The locales plugins add, as plain rows, and the core ones they hide.
 * `src/lib/locales.ts` appends the rows to the core three and leaves the
 * hidden codes out of the list the console offers and routes; `next.config.ts`
 * reads the result, so nothing here may import React, next-intl or a catalog.
 */
import { ALFAREQ_HIDDEN_LOCALES } from "./alfareq-brand/hidden-locales";
import { ARABIC } from "./arabic/locale";

export const PLUGIN_LOCALES = [ARABIC] as const;

export const HIDDEN_LOCALES: readonly string[] = [...ALFAREQ_HIDDEN_LOCALES];
