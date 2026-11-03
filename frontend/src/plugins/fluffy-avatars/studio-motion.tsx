"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { TRANSITIONS, type Transition } from "./catalog";
import { EYE_SIZE_MAX, EYE_SIZE_MIN } from "./render";

interface StudioMotionProps {
  transition: Transition;
  onTransition: (transition: Transition) => void;
  eyeSize: number;
  onEyeSize: (eyeSize: number) => void;
}

/** The studio's last two controls: how the body changes (a preview) and how big the eyes are. */
export function StudioMotion({ transition, onTransition, eyeSize, onEyeSize }: StudioMotionProps) {
  const t = useTranslations("fluffyAvatars");
  return (
    <>
      <section className="flex flex-col gap-2" aria-labelledby="ff-transition">
        <h3 id="ff-transition" className="text-sm font-semibold">
          {t("transition")}
        </h3>
        <p className="text-muted-foreground -mt-1 text-xs">{t("transitionHint")}</p>
        <div className="flex flex-wrap gap-1.5">
          {TRANSITIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={transition === option}
              onClick={() => onTransition(option)}
              className={cn(
                "focus-visible:ring-ring rounded-full border px-3 py-1 text-xs outline-none focus-visible:ring-2",
                transition === option
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted/60 text-muted-foreground",
              )}
            >
              {t(`transitions.${option}`)}
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <label htmlFor="ff-eye-size" className="text-sm font-semibold">
          {t("eyeSize")}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="ff-eye-size"
            type="range"
            min={EYE_SIZE_MIN}
            max={EYE_SIZE_MAX}
            step={0.05}
            value={eyeSize}
            onChange={(event) => onEyeSize(Number(event.currentTarget.value))}
            className="accent-foreground min-w-0 flex-1"
          />
          <span className="text-muted-foreground w-10 text-end text-xs tabular-nums">
            {t("eyeSizeValue", { value: eyeSize })}
          </span>
        </div>
      </section>
    </>
  );
}
