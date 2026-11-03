/**
 * The plugin's backend routes, reached through the console's own proxy for
 * plugins (the catch-all route under `src/app/api/plugins`).
 *
 * Lookups are batched: every avatar on a page asks for its own agent, and one
 * request per face would be a hundred requests on the agents list. Asks made in
 * the same tick are collected and sent together, up to the backend's limit each.
 */
import { apiClient } from "@/lib/api-client";

import type { AvatarState, AvatarStyle } from "./catalog";

/** The states the server decides; `thinking` is the console's, which knows a turn is in flight. */
export type LiveState = Extract<AvatarState, "idle" | "notification" | "asleep" | "failed">;

/** What a lookup knows about one agent: its stored style, if any, and what it is doing. */
export interface AgentAvatar {
  style: AvatarStyle | null;
  state: LiveState;
}

interface LookupResponse {
  styles: Record<string, AvatarStyle>;
  states: Record<string, LiveState>;
}

const BASE = "/plugins/fluffy-avatars/agents";

/** The backend's `LOOKUP_LIMIT`: one request never asks about more agents than this. */
export const LOOKUP_LIMIT = 200;

/** How long asks wait for company before they go: long enough for one render pass. */
const BATCH_WINDOW_MS = 10;

interface Waiter {
  resolve: (avatar: AgentAvatar) => void;
  reject: (error: unknown) => void;
}

let pending = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function send(batch: Map<string, Waiter[]>): Promise<void> {
  const ids = [...batch.keys()];
  for (let start = 0; start < ids.length; start += LOOKUP_LIMIT) {
    const chunk = ids.slice(start, start + LOOKUP_LIMIT);
    try {
      const { styles, states } = await apiClient.post<LookupResponse>(`${BASE}/lookup`, {
        agent_ids: chunk,
      });
      for (const id of chunk)
        for (const waiter of batch.get(id) ?? [])
          waiter.resolve({ style: styles[id] ?? null, state: states[id] ?? "idle" });
    } catch (error) {
      for (const id of chunk) for (const waiter of batch.get(id) ?? []) waiter.reject(error);
    }
  }
}

function flush(): void {
  const batch = pending;
  pending = new Map();
  timer = null;
  void send(batch);
}

/** One agent's style and state - fetched alongside every other ask this tick. */
export function loadAvatar(agentId: string): Promise<AgentAvatar> {
  return new Promise((resolve, reject) => {
    const waiters = pending.get(agentId) ?? [];
    waiters.push({ resolve, reject });
    pending.set(agentId, waiters);
    timer ??= setTimeout(flush, BATCH_WINDOW_MS);
  });
}

export function saveStyle(agentId: string, style: AvatarStyle): Promise<{ style: AvatarStyle }> {
  return apiClient.put<{ style: AvatarStyle }>(`${BASE}/${agentId}`, style);
}

export function resetStyle(agentId: string): Promise<void> {
  return apiClient.delete<void>(`${BASE}/${agentId}`);
}
