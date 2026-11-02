/**
 * The locales plugins add, as plain rows. `src/lib/locales.ts` appends them to
 * the core three; `next.config.ts` reads the result, so nothing here may import
 * React, next-intl or a catalog.
 */
import { ARABIC } from "./arabic/locale";

export const PLUGIN_LOCALES = [ARABIC] as const;
