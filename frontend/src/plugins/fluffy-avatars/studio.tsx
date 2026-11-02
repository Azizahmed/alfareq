"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
} from "@/components/ui";
import { DIALOG_BODY, DIALOG_BROAD, DIALOG_COLUMN } from "@/lib/dialog-sizes";
import type { AgentAvatarToolsSlotProps } from "@/lib/plugin-slots";

import type { AvatarState, AvatarStyle } from "./catalog";
import { derivedStyle } from "./derive";
import { StudioPickers } from "./studio-pickers";
import { StudioPreview } from "./studio-preview";
import { useAgentAvatar, useAvatarStyleMutations } from "./use-avatar-style";

function bodyKey(style: AvatarStyle): string {
  return style.character ?? `${style.shape}-${style.colour}`;
}

interface StudioDialogProps extends AgentAvatarToolsSlotProps {
  stored: AvatarStyle | null;
  onClose: () => void;
}

/** The studio itself: mounted only while open, so its draft starts from what is stored. */
function StudioDialog({ agentId, name, slug, colorSlot, stored, onClose }: StudioDialogProps) {
  const t = useTranslations("fluffyAvatars");
  const [draft, setDraft] = useState<AvatarStyle>(stored ?? derivedStyle(slug, colorSlot));
  const [state, setState] = useState<AvatarState>("idle");
  const [alwaysAnimate, setAlwaysAnimate] = useState(false);
  const { save, reset } = useAvatarStyleMutations(agentId);
  const busy = save.isPending || reset.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${DIALOG_BROAD} ${DIALOG_COLUMN}`}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className={`grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${DIALOG_BODY}`}>
          <StudioPreview
            style={draft}
            state={state}
            name={name}
            bodyKey={bodyKey(draft)}
            alwaysAnimate={alwaysAnimate}
            onAlwaysAnimate={setAlwaysAnimate}
          />
          <StudioPickers style={draft} state={state} onStyle={setDraft} onState={setState} />
        </div>
        <DialogFooter className="gap-2">
          {stored && (
            <Button
              variant="ghost"
              className="sm:me-auto"
              disabled={busy}
              onClick={() => reset.mutate(undefined, { onSuccess: onClose })}
            >
              {t("reset")}
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={busy} onClick={() => save.mutate(draft, { onSuccess: onClose })}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The `agent-avatar-tools` slot: a palette button beside the portrait, for editors only. */
export function AvatarStudioButton(props: AgentAvatarToolsSlotProps) {
  const t = useTranslations("fluffyAvatars");
  const [open, setOpen] = useState(false);
  const stored = useAgentAvatar(props.agentId).data?.style ?? null;
  if (!props.canEdit) return null;
  return (
    <>
      <IconButton
        aria-label={t("open")}
        title={t("open")}
        onClick={() => setOpen(true)}
        data-tour="agent-avatar-studio"
      >
        <Palette className="h-4 w-4" />
      </IconButton>
      {open && <StudioDialog {...props} stored={stored} onClose={() => setOpen(false)} />}
    </>
  );
}
