"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui";

import type { AvatarState, AvatarStyle } from "./catalog";
import { FluffyFace } from "./fluffy-face";

/** The three sizes the console draws an agent at: a list row, a message, a card. */
const ROW_SIZES = [24, 32, 40] as const;

interface StudioPreviewProps {
  style: AvatarStyle;
  state: AvatarState;
  name: string;
  /** Changes with the body, so the preview replays its squash-and-settle. */
  bodyKey: string;
  alwaysAnimate: boolean;
  onAlwaysAnimate: (value: boolean) => void;
}

/** The big portrait, and the same face where the console will actually draw it. */
export function StudioPreview({
  style,
  state,
  name,
  bodyKey,
  alwaysAnimate,
  onAlwaysAnimate,
}: StudioPreviewProps) {
  const t = useTranslations("fluffyAvatars");
  return (
    // Held in view while the pickers beside it scroll.
    <div className="flex flex-col gap-5 md:sticky md:top-0 md:self-start">
      <div className="bg-muted/40 flex aspect-square items-center justify-center rounded-2xl">
        <div key={bodyKey} className="ff-pop size-40">
          <FluffyFace style={style} state={state} animate={alwaysAnimate} />
        </div>
      </div>
      <div className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">{t("inTheApp")}</span>
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <Switch checked={alwaysAnimate} onCheckedChange={onAlwaysAnimate} />
            {t("alwaysAnimate")}
          </label>
        </div>
        <ul className="flex flex-col gap-1">
          {ROW_SIZES.map((size) => (
            <li
              key={size}
              className="hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <span className="shrink-0" style={{ width: size, height: size }}>
                <FluffyFace style={style} state={state} animate={alwaysAnimate} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {t("pixels", { size })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
