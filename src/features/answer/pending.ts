// What this browser has asked of a job and is waiting to see: the card shows it at once, and it
// clears the moment the engine's next frame for that job lands (or after a while, said honestly).
import { create } from "zustand";

interface Pending {
  label: string;
  at: number;
}

interface PendingState {
  byJob: Record<string, Pending>;
  start: (key: string, label: string) => void;
  clear: (key: string) => void;
}

export const usePending = create<PendingState>((set) => ({
  byJob: {},
  start: (key, label) => set((s) => ({ byJob: { ...s.byJob, [key]: { label, at: Date.now() } } })),
  clear: (key) =>
    set((s) => {
      if (!s.byJob[key]) return s;
      const next = { ...s.byJob };
      delete next[key];
      return { byJob: next };
    }),
}));

export const jobKey = (project?: string | null, issue?: string | null) => `${project ?? ""}#${issue ?? ""}`;
