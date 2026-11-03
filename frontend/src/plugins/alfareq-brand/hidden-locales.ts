/**
 * The platform's languages Alfareq does not offer: the console is English and
 * Arabic. Polish and German stay in the platform, translated and updated with
 * it, and come back by removing them from this list.
 *
 * Plain data, like every row `src/plugins/locales.ts` lists: `next.config.ts`
 * reads the result.
 */
export const ALFAREQ_HIDDEN_LOCALES = ["pl", "de"] as const;
