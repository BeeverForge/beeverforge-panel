// The floor's socket (`/api/stream`): the project list and the tech-lead's conversation for the
// project on screen, pushed as they change. Reconnects with backoff; the screen says so meanwhile.
import type { QueryClient } from "@tanstack/react-query";
import { token } from "../api/http";
import { keys } from "../api/queries";
import type { MessagesRead, ProjectRow } from "../api/types";
import { useLive } from "./status";

interface UpdateFrame {
  kind: "update";
  project?: string;
  projects?: ProjectRow[] | null;
  chat?: MessagesRead | null;
}

export interface FloorSocket {
  follow: (project: string) => void;
  close: () => void;
}

export function startFloorSocket(client: QueryClient): FloorSocket {
  let ws: WebSocket | null = null;
  let project = "";
  let tries = 0;
  let timer: number | undefined;
  let stopped = false;

  const url = () => {
    const u = new URL("/api/stream", location.href);
    u.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const t = token();
    if (t) u.searchParams.set("token", t);
    if (project) u.searchParams.set("project", project);
    return u.toString();
  };

  const open = () => {
    if (stopped) return;
    const sock = new WebSocket(url());
    ws = sock;
    sock.onopen = () => {
      tries = 0;
      useLive.getState().set({ floor: "live" });
    };
    sock.onmessage = (ev) => {
      let frame: UpdateFrame | { kind: string; reason?: string; ended?: unknown };
      try {
        frame = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (frame.kind === "update") {
        const f = frame as UpdateFrame;
        // `null` is a section the server could not read: the last list stands, never an empty one.
        if (Array.isArray(f.projects)) client.setQueryData(keys.projects, f.projects);
        if (f.chat && f.project) client.setQueryData(keys.messages(f.project), f.chat);
      } else if (frame.kind === "bye") {
        useLive.getState().set({ floor: (frame as { ended?: unknown }).ended ? "ended" : "reconnecting" });
      }
    };
    sock.onclose = () => {
      if (stopped) return;
      useLive.getState().set({ floor: "reconnecting" });
      const wait = Math.min(30_000, 1000 * 2 ** Math.min(tries++, 5)) * (0.75 + Math.random() * 0.5);
      timer = window.setTimeout(open, wait);
    };
  };

  open();
  return {
    follow(next) {
      if (next === project) return;
      project = next;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ project: next }));
    },
    close() {
      stopped = true;
      window.clearTimeout(timer);
      ws?.close();
    },
  };
}
