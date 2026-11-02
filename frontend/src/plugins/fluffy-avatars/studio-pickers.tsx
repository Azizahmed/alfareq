"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import {
  CHARACTER_IDS,
  COLOURS,
  EXPRESSIONS,
  SHAPES,
  STATES,
  type AvatarState,
  type AvatarStyle,
} from "./catalog";
import { FluffyFace } from "./fluffy-face";

interface ChoiceProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}

function Choice({ label, selected, onSelect, children }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "hover:bg-muted/60 focus-visible:ring-ring flex flex-col items-center gap-1 rounded-xl border border-transparent p-1.5 outline-none focus-visible:ring-2",
        selected && "border-foreground/60 bg-muted/40",
      )}
    >
      <span className="size-10">{children}</span>
      <span className="text-muted-foreground max-w-full truncate text-[11px]">{label}</span>
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>}
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">{children}</div>
    </section>
  );
}

interface StudioPickersProps {
  style: AvatarStyle;
  state: AvatarState;
  onStyle: (style: AvatarStyle) => void;
  onState: (state: AvatarState) => void;
}

/** Character, shape, expression, colour and state - each a row of live thumbnails. */
export function StudioPickers({ style, state, onStyle, onState }: StudioPickersProps) {
  const t = useTranslations("fluffyAvatars");
  // A shape without a colour of its own keeps the one it had, or the console's violet.
  const tint = style.colour ?? 8;
  return (
    <div className="flex flex-col gap-5">
      <Section title={t("character")}>
        {CHARACTER_IDS.map((id) => (
          <Choice
            key={id}
            label={t(`characters.${id}`)}
            selected={style.character === id}
            onSelect={() =>
              onStyle({ character: id, shape: null, colour: null, expression: style.expression })
            }
          >
            <FluffyFace style={{ character: id, shape: null, colour: null, expression: "own" }} />
          </Choice>
        ))}
      </Section>
      <Section title={t("shape")}>
        {SHAPES.map((shape) => (
          <Choice
            key={shape}
            label={t(`shapes.${shape}`)}
            selected={style.shape === shape}
            onSelect={() =>
              onStyle({ character: null, shape, colour: tint, expression: style.expression })
            }
          >
            <FluffyFace style={{ character: null, shape, colour: tint, expression: "own" }} />
          </Choice>
        ))}
      </Section>
      <Section title={t("expression")}>
        {EXPRESSIONS.map((expression) => (
          <Choice
            key={expression}
            label={t(`expressions.${expression}`)}
            selected={style.expression === expression}
            onSelect={() => onStyle({ ...style, expression })}
          >
            <FluffyFace style={{ ...style, expression }} />
          </Choice>
        ))}
      </Section>
      <Section title={t("colour")} hint={t("colourHint")}>
        {COLOURS.map((hex, index) => (
          <button
            key={hex}
            type="button"
            aria-label={t("swatch", { index: index + 1 })}
            aria-pressed={style.shape !== null && style.colour === index}
            disabled={style.character !== null}
            onClick={() => onStyle({ ...style, colour: index })}
            className="aria-pressed:border-foreground mx-auto size-8 rounded-full border-2 border-transparent outline-none focus-visible:ring-2 disabled:opacity-40"
            style={{ background: hex }}
          />
        ))}
      </Section>
      <Section title={t("state")} hint={t("stateHint")}>
        {STATES.map((option) => (
          <Choice
            key={option}
            label={t(`states.${option}`)}
            selected={state === option}
            onSelect={() => onState(option)}
          >
            <FluffyFace style={style} state={option} />
          </Choice>
        ))}
      </Section>
    </div>
  );
}
