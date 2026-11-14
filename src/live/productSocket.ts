// The conversation with the product role (`/api/product/stream`): one socket, re-subscribed as the
// person moves between the project's room and their own conversations. Sent messages show at once
// and are confirmed by the server's `ack`; what waits for a yes arrives as `staged`.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "./status";

export interface Turn {
  id: string;
  who: "person" | "agent";
  speaker: string;
  text: string;
  ts: string;
  mine: boolean;
  /** Shown before the server confirmed it. */
  sending?: boolean;
  refused?: string;
  attachments?: { id?: string; name?: string; type?: string }[];
}

export interface Staged {
  token: string;
  approve: string;
  reject: string;
}

export interface Presence {
  state: "idle" | "thinking" | "answering" | "offline";
  ahead: number;
  stage?: string | null;
}

const mint = () => {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
};

function fromTurn(t: Record<string, unknown>): Turn {
  return {
    id: String(t.id || mint()),
    who: t.role === "agent" || t.role === "assistant" ? "agent" : "person",
    speaker: String(t.actor ?? ""),
    text: String(t.text ?? ""),
    ts: String(t.ts ?? ""),
    mine: Boolean(t.mine),
    attachments: (t.attachments as Turn["attachments"]) ?? undefined,
  };
}

/** One conversation: the component that calls this is keyed by it, so another conversation is a
 *  fresh hook (and socket) rather than this one emptied. */
export function useProductConversation(project: string, room: boolean, session: string) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [presence, setPresence] = useState<Presence>({ state: "idle", ahead: 0 });
  const [earlier, setEarlier] = useState("");
  const [ready, setReady] = useState(false);
  const [refusal, setRefusal] = useState("");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let tries = 0;
    let timer: number | undefined;
    let stopped = false;
    const subscribe = () => {
      const sock = ws.current;
      if (!sock || sock.readyState !== WebSocket.OPEN || !project) return;
      sock.send(JSON.stringify({ kind: "subscribe", project, room, ...(room ? {} : { session }) }));
    };
    const open = () => {
      if (stopped) return;
      const u = new URL("/api/product/stream", location.href);
      u.protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const sock = new WebSocket(u);
      ws.current = sock;
      sock.onopen = () => {
        tries = 0;
        useLive.getState().set({ product: "live" });
        subscribe();
      };
      sock.onmessage = (ev) => {
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        switch (m.kind) {
          case "subscribed":
            break;
          case "history":
            setTurns(((m.turns as Record<string, unknown>[]) ?? []).map(fromTurn));
            setStaged((m.staged as Staged | null) ?? null);
            setEarlier(String(m.earlier ?? ""));
            setReady(true);
            break;
          case "earlier":
            setTurns((t) => [...((m.turns as Record<string, unknown>[]) ?? []).map(fromTurn), ...t]);
            setEarlier(String(m.earlier ?? ""));
            break;
          case "said": {
            const id = String(m.id ?? "");
            setTurns((t) =>
              t.some((x) => x.id === id)
                ? t.map((x) => (x.id === id ? { ...x, sending: false } : x))
                : [...t, { id, who: "person", speaker: String(m.speaker ?? ""), text: String(m.text ?? ""), ts: new Date().toISOString(), mine: Boolean(m.mine), attachments: m.attachments as Turn["attachments"] }],
            );
            break;
          }
          case "reply":
            setTurns((t) => [...t, { id: String(m.id ?? mint()), who: "agent", speaker: "", text: String(m.text ?? ""), ts: new Date().toISOString(), mine: false }]);
            break;
          case "staged":
            setStaged((m.staged as Staged | null) ?? null);
            break;
          case "presence":
            setPresence({ state: (m.state as Presence["state"]) ?? "idle", ahead: Number(m.ahead ?? 0), stage: (m.stage as string) ?? null });
            break;
          case "ack":
            setTurns((t) => t.map((x) => (x.id === m.id ? { ...x, sending: false, refused: m.ok === false ? String(m.text ?? "refused") : undefined } : x)));
            break;
          case "refused":
            if (m.id) setTurns((t) => t.map((x) => (x.id === m.id ? { ...x, sending: false, refused: String(m.why ?? "refused") } : x)));
            else setRefusal(String(m.why ?? "The conversation was refused."));
            break;
          case "resync":
            subscribe();
            break;
          case "bye":
            sock.close();
            break;
        }
      };
      sock.onclose = () => {
        if (stopped) return;
        useLive.getState().set({ product: "reconnecting" });
        setPresence((p) => ({ ...p, state: "offline" }));
        timer = window.setTimeout(open, Math.min(30_000, 1000 * 2 ** Math.min(tries++, 5)));
      };
    };
    open();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      ws.current?.close();
    };
  }, [project, room, session]);

  const say = useCallback((text: string, attachments: string[] = [], context?: Record<string, unknown>) => {
    const sock = ws.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return false;
    const id = mint();
    setTurns((t) => [...t, { id, who: "person", speaker: "you", text, ts: new Date().toISOString(), mine: true, sending: true }]);
    sock.send(JSON.stringify({ kind: "say", id, text, ...(attachments.length ? { attachments } : {}), ...(context ? { context } : {}) }));
    return true;
  }, []);

  const loadEarlier = useCallback(() => {
    if (earlier) ws.current?.send(JSON.stringify({ kind: "earlier", before: earlier }));
  }, [earlier]);

  return { turns, staged, setStaged, presence, earlier, loadEarlier, say, ready, refusal };
}

export const newSession = mint;
