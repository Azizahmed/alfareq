import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api-error";

import { loadAvatar, resetStyle, saveStyle, type AgentAvatar } from "./api";
import type { AvatarStyle } from "./catalog";

/** The plugin's own key space, so nothing in core has to know it exists. */
export const avatarStyleKey = (agentId: string) => ["plugins", "fluffy-avatars", agentId] as const;

/**
 * A style changes when somebody opens the studio, which is rare; a state changes
 * with the agent's runs. A minute keeps a parked or failed run from showing for
 * long after somebody dealt with it, without a request per face per render.
 */
const STALE_MS = 60 * 1000;

/** The agent's stored style and live state; `data` is undefined while it loads. */
export function useAgentAvatar(agentId: string) {
  return useQuery({
    queryKey: avatarStyleKey(agentId),
    queryFn: () => loadAvatar(agentId),
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
  // The state is the server's to know, and a new style does not change it.
  const settle = (style: AvatarStyle | null) =>
    queryClient.setQueryData<AgentAvatar>(avatarStyleKey(agentId), (current) => ({
      style,
      state: current?.state ?? "idle",
    }));
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
