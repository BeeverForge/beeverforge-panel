// The product role's conversation (`/api/product/stream`) and the rows that belong to it. The
// role's reads — requirements, documents, the agenda, its board — are the rig's own, from the
// context repositories the seed wrote; only what needs a model to answer is simulated here: the
// replies, the conversations they live in, and the proposals they stage for a person's yes.
import type http from "node:http";
import type { Duplex } from "node:stream";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { Refused, type Factory } from "./factory.ts";

type Handler = (req: http.IncomingMessage, res: http.ServerResponse, m: RegExpMatchArray, url: URL) => unknown;

interface Turn {
  role: "person" | "agent";
  actor: string;
  text: string;
  ts: string;
  id: string;
  in_reply_to: string;
  mine: boolean;
  overheard: boolean;
}

interface Staged {
  token: string;
  approve: string;
  reject: string;
  /** What a yes records. */
  records: string;
}

interface Conversation {
  turns: Turn[];
  staged: Staged | null;
  title: string;
  sockets: Set<WebSocket>;
}

const AGENT = "Nina";

export class ProductRoom {
  private sockets = new WebSocketServer({ noServer: true });
  private conversations = new Map<string, Conversation>();
  private seq = 1;

  constructor(private factory: Factory) {
    this.sockets.on("connection", (ws: WebSocket) => this.serve(ws));
  }

  private key(project: string, room: boolean, session: string) {
    return `${project}:${room ? "#room" : session}`;
  }

  private conversation(key: string): Conversation {
    let c = this.conversations.get(key);
    if (!c) {
      c = { turns: [], staged: null, title: "", sockets: new Set() };
      this.conversations.set(key, c);
    }
    return c;
  }

  handles(name: string): boolean {
    return ["product_answer", "product_sessions", "product_session_rename", "product_session_delete"].includes(name);
  }

  async act(name: string, params: Record<string, unknown>): Promise<[string, Record<string, unknown>]> {
    const project = String(params.project ?? "");
    switch (name) {
      case "product_sessions": {
        const sessions = [...this.conversations.entries()]
          .filter(([k, c]) => k.startsWith(`${project}:`) && !k.endsWith(":#room") && c.turns.length)
          .map(([k, c]) => {
            const last = c.turns.at(-1)!;
            return { session: k.slice(project.length + 1), title: c.title || c.turns[0]!.text.slice(0, 60), last: last.text.slice(0, 90), last_ts: last.ts };
          })
          .sort((a, b) => b.last_ts.localeCompare(a.last_ts));
        return [`${sessions.length} conversation(s) of yours with the product role`, { room: { key: project }, sessions, keyed: false, agent: AGENT }];
      }
      case "product_session_rename": {
        const c = this.conversations.get(`${project}:${String(params.session ?? "")}`);
        if (!c) throw new Refused(404, "that conversation is not one of yours");
        c.title = String(params.title ?? "").trim();
        return ["renamed", { session: params.session, title: c.title }];
      }
      case "product_session_delete": {
        const k = `${project}:${String(params.session ?? "")}`;
        if (!this.conversations.delete(k)) throw new Refused(404, "that conversation is not one of yours");
        return [`erased — ${AGENT} will not remember what you said in it`, {}];
      }
      case "product_answer": {
        const token = String(params.token ?? "");
        const found = [...this.conversations.values()].find((c) => c.staged?.token === token);
        if (!found?.staged) throw new Refused(409, "that proposal changed or was already answered — nothing was recorded");
        const yes = /^(yes|approve|confirm|y|sim)$/i.test(String(params.answer ?? ""));
        const staged = found.staged;
        found.staged = null;
        this.broadcast(found, { kind: "staged", product: project, staged: null });
        const said = yes ? `Recorded: ${staged.records}` : "Not recorded. Nothing was written.";
        this.reply(found, project, said, String(params.message_id ?? ""));
        return [said, { outcome: yes ? "done" : "rejected" }];
      }
      default:
        return [`${name} ran`, {}];
    }
  }

  routes(): [string, string, Handler][] {
    return [];
  }

  upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer) {
    this.sockets.handleUpgrade(req, socket, head, (ws) => this.sockets.emit("connection", ws, req));
  }

  private broadcast(c: Conversation, frame: Record<string, unknown>) {
    const text = JSON.stringify(frame);
    for (const ws of c.sockets) if (ws.readyState === ws.OPEN) ws.send(text);
  }

  private reply(c: Conversation, project: string, text: string, inReplyTo: string, staged?: Staged) {
    const id = `r${this.seq}`;
    c.turns.push({ role: "agent", actor: AGENT, text, ts: new Date().toISOString(), id, in_reply_to: inReplyTo, mine: false, overheard: false });
    this.broadcast(c, { kind: "presence", product: project, state: "answering", ahead: 0 });
    this.broadcast(c, { kind: "reply", product: project, seq: this.seq++, id, text, type: staged ? "proposal" : "answer", in_reply_to: inReplyTo, options: staged ? { token: staged.token, approve: staged.approve, reject: staged.reject } : null, final: true });
    if (staged) {
      c.staged = staged;
      this.broadcast(c, { kind: "staged", product: project, staged: { token: staged.token, approve: staged.approve, reject: staged.reject } });
    }
    this.broadcast(c, { kind: "presence", product: project, state: "idle", ahead: 0 });
  }

  private serve(ws: WebSocket) {
    let current: Conversation | null = null;
    let project = "";
    const send = (frame: Record<string, unknown>) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(frame));
    send({ kind: "hello" });
    ws.on("close", () => current?.sockets.delete(ws));
    ws.on("message", (raw) => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (m.kind === "subscribe") {
        current?.sockets.delete(ws);
        project = String(m.project ?? "");
        const room = Boolean(m.room);
        const session = String(m.session ?? "");
        current = this.conversation(this.key(project, room, session));
        current.sockets.add(ws);
        const s = current.staged;
        send({ kind: "subscribed", project, product: project, private: !room, room, session });
        send({ kind: "history", product: project, turns: current.turns.slice(-40), staged: s ? { token: s.token, approve: s.approve, reject: s.reject } : null, earlier: current.turns.length > 40 ? "40" : "" });
        return;
      }
      if (m.kind === "earlier" && current) {
        const before = Number(m.before ?? 0);
        const from = Math.max(0, current.turns.length - before - 40);
        send({ kind: "earlier", product: project, turns: current.turns.slice(from, current.turns.length - before), earlier: from > 0 ? String(before + 40) : "" });
        return;
      }
      if (m.kind === "say" && current) {
        const c = current;
        const id = String(m.id ?? randomUUID());
        const text = String(m.text ?? "").trim();
        if (!text) return;
        c.turns.push({ role: "person", actor: "you", text, ts: new Date().toISOString(), id, in_reply_to: "", mine: true, overheard: false });
        send({ kind: "ack", id, ok: true, text: "received", product: project });
        this.broadcast(c, { kind: "said", product: project, seq: this.seq++, id, text, speaker: "you", mine: true, overheard: false });
        this.broadcast(c, { kind: "presence", product: project, state: "thinking", ahead: 0, stage: "reading the requirements and the board" });
        setTimeout(() => {
          const [said, staged] = this.answer(project, text);
          this.reply(c, project, said, id, staged);
        }, 2600);
      }
    });
  }

  private answer(project: string, text: string): [string, Staged | undefined] {
    const live = this.factory.live(project);
    if (/\b(need|want|add|should|could we|please)\b/i.test(text)) {
      const what = text.replace(/^@?\w+[,:]?\s*/i, "").replace(/[.?!]+$/, "");
      return [
        `I can write that down as a requirement:\n\n**${what.charAt(0).toUpperCase()}${what.slice(1)}**\n\n- Asked by: you\n- What must be true: I will draft the criteria with you before anything is built.\n\nIt lands as *proposed*; nothing is built until somebody accepts it.`,
        { token: randomUUID(), approve: "Confirm and record", reject: "Do not record", records: `a proposed requirement — "${what}"` },
      ];
    }
    if (/status|where|progress|doing|shipped|done/i.test(text)) {
      if (live) return [`#${live.issue} — **${live.title}** — is being built right now: ${live.state.replaceAll("_", " ")}. I will tell you here when it ships.`, undefined];
      return ["Nothing is being built on this product at this moment. The next card in TO-DO starts at the next pickup.", undefined];
    }
    return ["I have noted that. I will check it against the written requirements and come back to you here with what I find.", undefined];
  }
}
