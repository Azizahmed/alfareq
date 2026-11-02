/**
 * The enabled plugins, in the order their rewrites apply. Removing a line here
 * switches a plugin off; its folder can stay.
 */
import type { FrontendPlugin } from "@/lib/plugins";

import { alfareqBrand } from "./alfareq-brand/manifest";
import { arabic } from "./arabic/manifest";
import { fluffyAvatars } from "./fluffy-avatars/manifest";

export const PLUGINS: readonly FrontendPlugin[] = [arabic, fluffyAvatars, alfareqBrand];
