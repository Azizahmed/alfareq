import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api-error";

import { loadStyle, resetStyle, saveStyle } from "./api";
import type { AvatarStyle } from "./catalog";

/** The plugin's own key space, so nothing in core has to know it exists. */
export const avatarStyleKey = (agentId: string) => ["plugins", "fluffy-avatars", agentId] as const;

/** A style changes when somebody opens the studio, which is rare: five minutes is plenty. */
const STALE_MS = 5 * 60 * 1000;

/** The agent's stored style; `data` is null when it has none and while it loads. */
export function useAvatarStyle(agentId: string) {
  return useQuery({
    queryKey: avatarStyleKey(agentId),
    queryFn: () => loadStyle(agentId),
    staleTime: STALE_MS,
    // A failed lookup is a face drawn from the handle, which is what the agent
    // wore before anybody opened the studio - not worth three retries per face.
    retry: false,
  });
}

/** Save or forget the style, and redraw every face of this agent on the page. */
export function useAvatarStyleMutations(agentId: string) {
  const queryClient = useQueryClient();
  const tErrors = useTranslations("errors");
  const settle = (style: AvatarStyle | null) =>
    queryClient.setQueryData(avatarStyleKey(agentId), style);
  const onError = (error: unknown) => toast.error(getErrorMessage(error, tErrors));

  const save = useMutation({
    mutationFn: (style: AvatarStyle) => saveStyle(agentId, style),
    onSuccess: ({ style }) => settle(style),
    onError,
  });
  const reset = useMutation({
    mutationFn: () => resetStyle(agentId),
    onSuccess: () => settle(null),
    onError,
  });
  return { save, reset };
}
