// What the page knows about its own connections, so the screen can be honest about them: a floor
// read over a dead stream is shown as stale, never as calm.
import { create } from "zustand";

export type Link = "connecting" | "live" | "reconnecting" | "ended" | "offline";

interface LiveState {
  engine: Link;
  floor: Link;
  product: Link;
  /** When the last engine frame or read landed (ms epoch), or null before the first. */
  engineAt: number | null;
  /** The engine answered `jobs: null`: the list shown is the last one read. */
  jobsUnread: boolean;
  endedWhy: string;
  set: (patch: Partial<Omit<LiveState, "set">>) => void;
}

export const useLive = create<LiveState>((set) => ({
  engine: "connecting",
  floor: "connecting",
  product: "connecting",
  engineAt: null,
  jobsUnread: false,
  endedWhy: "",
  set: (patch) => set(patch),
}));

/** The floor is stale when no frame or read has landed for this long. */
export const STALE_AFTER_MS = 45_000;
