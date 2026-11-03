"use client";

import { BrandMark } from "@/components/branding/brand-mark";
import { useBranding } from "@/components/branding/branding-provider";
import { builtInWordmark } from "@/lib/branding";

/**
 * The deployment's mark with its name beside it - or, where a brand plugin
 * ships a logo that already spells the name, that logo alone.
 *
 * The logo is a mask over the text colour rather than an `<img>`: one drawing
 * reads on the dark theme and the light one, as the written name does. It is
 * named for a screen reader, since it stands where the name was.
 */
export function BrandLockup({ markSize = 24 }: { markSize?: number }) {
  const branding = useBranding();
  const wordmark = builtInWordmark(branding);
  if (!wordmark) {
    return (
      <>
        <BrandMark size={markSize} />
        {branding.appName}
      </>
    );
  }
  const mask = `url("${wordmark.dataUri}") left center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={branding.appName}
      data-testid="brand-wordmark"
      className="block shrink-0 bg-current"
      style={{
        height: markSize,
        width: Math.round(markSize * wordmark.aspectRatio),
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
