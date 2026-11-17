// The factory simulator: a reverse proxy in front of the rig's real API that answers, itself, every
// route only a running engine and worker could answer — the jobs, their logs, the floor, what needs
// a person, the tech-lead, spend and previews — and passes everything else through unchanged.
//
//   npm run sim                 SIM_SPEED=2 npm run sim      PANEL_TARGET=http://127.0.0.1:8788
//
// Both panels can be pointed at it: the new one through Vite's proxy, the default one by opening
// http://127.0.0.1:8790/ directly, so the two can be compared on the same live floor.
import http from "node:http";
import { URL } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { Factory, Refused } from "./factory.ts";
import { decisions, engineFrame, engineRow, engineUi, floor, inbox, jobDetail, journalJobs, metrics, pullRequest } from "./views.ts";
import { Previews } from "./previews.ts";
import { ProductRoom } from "./product.ts";
import type { Outcome } from "./types.ts";

const BACKEND = process.env.PANEL_TARGET ?? "http://127.0.0.1:8788";
const PORT = Number(process.env.SIM_PORT ?? 8790);
const factory = new Factory(BACKEND, Number(process.env.SIM_SPEED ?? 1));
const previews = new Previews(factory);
const product = new ProductRoom(factory);

type Handler = (req: http.IncomingMessage, res: http.ServerResponse, m: RegExpMatchArray, url: URL) => unknown;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/\{(\w+)\}/g, "([^/]+)")}$`), h]);
/** A read served at `/api/v1/<x>` and at its deprecated alias `/api/<x>`. */
const read = (pattern: string, h: Handler) => {
  on("GET", `/api/v1/${pattern}`, h);
  on("GET", `/api/${pattern}`, h);
};

const send = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};
const ok = (res: http.ServerResponse, message: string, data: Record<string, unknown> = {}) =>
  send(res, 200, { ok: true, message, code: "", data });
const refuse = (res: http.ServerResponse, e: unknown) => {
  if (e instanceof Refused) {
    const code = e.status === 409 ? "conflict" : e.status === 400 ? "invalid" : "refused";
    return send(res, e.status, { ok: false, message: e.message, code, data: { reason: code }, detail: e.message });
  }
  console.error(e);
  return send(res, 500, { ok: false, message: "the simulator broke on this", code: "failed", data: { reason: "raised" }, detail: String(e) });
};
const dec = (s: string | undefined) => decodeURIComponent(s ?? "");

async function body(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}
async function json(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const raw = (await body(req)).toString("utf8");
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ── pass-through ─────────────────────────────────────────────────────────────────────────────

function forward(req: http.IncomingMessage, res: http.ServerResponse, raw?: Buffer, after?: () => void) {
  const target = new URL(req.url ?? "/", BACKEND);
  const headers = { ...req.headers, host: target.host };
  delete headers["content-length"];
  const out = http.request(target, { method: req.method, headers }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
    up.on("end", () => after?.());
  });
  out.on("error", (e) => send(res, 502, { detail: `the rig at ${BACKEND} did not answer (${e.message}) — npm run rig:serve` }));
  if (raw) {
    out.setHeader("content-length", raw.length);
    out.end(raw);
  } else req.pipe(out);
}

async function backendJson<T>(path: string, req: http.IncomingMessage): Promise<{ status: number; body: T }> {
  const res = await fetch(new URL(path, BACKEND), {
    headers: { ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}), ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}) },
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as T };
}

// ── the engine ───────────────────────────────────────────────────────────────────────────────

read("temporal/jobs", (_q, res) => send(res, 200, engineFrame(factory)));
read("floor", (_q, res) => send(res, 200, floor(factory)));
read("floor/{project}", (_q, res, m) => send(res, 200, floor(factory, dec(m[1]))));
read("inbox", (_q, res) => send(res, 200, inbox(factory)));
read("decisions", (_q, res) => send(res, 200, decisions(factory)));
read("attention", (_q, res) => send(res, 200, journalJobs(factory).filter((j) => ["on_hold", "needs_refinement", "paused", "awaiting_your_merge", "awaiting_prod_approval"].includes(j.state))));
read("jobs", (_q, res) => send(res, 200, journalJobs(factory)));
read("jobs/{project}/{issue}/detail", (_q, res, m) => send(res, 200, jobDetail(factory, dec(m[1]), dec(m[2]))));
on("GET", "/api/jobs/{project}/{issue}/events", (_q, res, m) => send(res, 200, journal(dec(m[1]), dec(m[2]))));
read("metrics", (_q, res, _m, url) => send(res, 200, metrics(factory, url.searchParams.get("project"))));
read("coordinator/messages", (_q, res) => send(res, 200, factory.coordinator));
read("loops/{project}", (_q, res, m) => send(res, 200, { project: dec(m[1]), waiting: [] }));
read("promote/{project}/{issue}", (_q, res) =>
  send(res, 200, { latest_tag: "v2.7.3", suggestions: { patch: "v2.7.4", minor: "v2.8.0", major: "v3.0.0" }, approvers: ["release-captain"], tag_prefix: "v" }),
);
read("messages/{project}", (_q, res, m) => {
  const p = dec(m[1]);
  send(res, 200, {
    project: p,
    messages: factory.chat.get(p) ?? [],
    pending: (factory.pending.get(p) ?? []).map((q) => ({ token: q.token, text: q.text, ts: q.ts, options: q.options, answer: { method: "POST", url: `/api/messages/${p}/answer` } })),
    suggestion: factory.suggestion.get(p) ?? null,
  });
});

// The projects are the rig's; the simulator only answers for the boxes, which it runs.
read("projects", async (req, res) => {
  const { status, body: rows } = await backendJson<Record<string, unknown>[]>("/api/v1/projects", req);
  if (status !== 200 || !Array.isArray(rows)) return send(res, status, rows);
  send(res, 200, rows.map(provenBox));
});

function provenBox(row: Record<string, unknown>) {
  return {
    ...row,
    box: { state: "proven", gate: "", sandbox: "worktree", image: "", at: new Date(Date.now() - 2 * 86_400_000).toISOString(), detail: "proven 2 days ago — setup and the gates ran, and the agent answered" },
  };
}

// The cockpit is the rig's; how the simulated worker runs each project is the simulator's.
on("GET", "/api/factory/{project}", async (req, res, m) => {
  const project = dec(m[1]);
  const { status, body: c } = await backendJson<Record<string, unknown>>(`/api/factory/${encodeURIComponent(project)}`, req);
  if (status !== 200 || !c) return send(res, status, c);
  send(res, 200, {
    ...c,
    single_agent: project !== "tidepool-mobile",
    tokens: { count: 2, ids: ["pool-a", "pool-b"], format: "oauth", source: "the simulator's pool" },
    models: { executor: "claude-sonnet-4-5", planner: "claude-opus-4-1", reviewer: "gpt-5-codex", product: "claude-sonnet-4-5", techlead: "claude-sonnet-4-5" },
    links: { ...(c.links as Record<string, string>), board: `/p/${encodeURIComponent(project)}/board`, temporal: engineUi.project(project) },
    engine_ui_hint: engineUi.base ? "" : engineUi.hint,
  });
});

// The board is the rig's; the columns only a job may set are the simulator's.
async function board(req: http.IncomingMessage, res: http.ServerResponse, m: RegExpMatchArray, url: URL) {
  const project = dec(m[1]);
  const pr = url.searchParams.get("pr");
  const sim = pr ? pullRequest(factory, project, pr) : null;
  if (pr && sim) url.searchParams.delete("pr");
  const { status, body: b } = await backendJson<Record<string, unknown>>(`/api/v1/board/${encodeURIComponent(project)}${url.search}`, req);
  if (status !== 200 || !b) return send(res, status, b);
  const cards = (b.cards as { ref: string; column: string }[] | null)?.map((c) => ({ ...c, column: factory.columnOf(project, c.ref) ?? c.column })) ?? null;
  const card = b.card as Record<string, unknown> | null;
  if (card?.ref) {
    const held = factory.columnOf(project, String(card.ref).replace(/^#/, ""));
    if (held) Object.assign(card, { started: true, finished: held === "Done", removes: false });
  }
  send(res, 200, { ...b, cards, card, ...(sim ? { pr: sim } : {}) });
}
on("GET", "/api/v1/board/{project}", board);
on("GET", "/api/board/{project}", board);

// ── the streams ──────────────────────────────────────────────────────────────────────────────

const streamHeaders = { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" };

on("GET", "/api/temporal/stream", (req, res) => {
  res.writeHead(200, streamHeaders);
  let last = "";
  const push = () => {
    const frame = JSON.stringify(engineFrame(factory));
    if (frame === last) return;
    last = frame;
    res.write(`data: ${frame}\n\n`);
  };
  let pending: NodeJS.Timeout | null = null;
  const soon = () => {
    pending ??= setTimeout(() => {
      pending = null;
      push();
    }, 150);
  };
  push();
  const hb = setInterval(() => res.write(": hb\n\n"), 2000);
  factory.on("engine", soon);
  req.on("close", () => {
    clearInterval(hb);
    if (pending) clearTimeout(pending);
    factory.off("engine", soon);
  });
});

function journal(project: string, issue: string) {
  return factory.jobs.filter((j) => j.project === project && j.issue === issue).flatMap((j) => j.events);
}

on("GET", "/api/jobs/{project}/{issue}/stream", (req, res, m) => {
  const project = dec(m[1]);
  const issue = dec(m[2]);
  const resume = String(req.headers["last-event-id"] ?? "").match(/^v2-(\d+)$/);
  let sent = resume ? Number(resume[1]) : 0;
  res.writeHead(200, streamHeaders);
  const flush = () => {
    const all = journal(project, issue);
    for (; sent < all.length; sent++) res.write(`id: v2-${sent + 1}\ndata: ${JSON.stringify(all[sent])}\n\n`);
  };
  flush();
  const onLog = (job: { project: string; issue: string }) => {
    if (job.project === project && job.issue === issue) flush();
  };
  const hb = setInterval(() => res.write(": hb\n\n"), 2000);
  factory.on("log", onLog);
  req.on("close", () => {
    clearInterval(hb);
    factory.off("log", onLog);
  });
});

// ── what a person answers ────────────────────────────────────────────────────────────────────

on("POST", "/api/temporal/act/{project}/{issue}", async (req, res, m) => {
  const b = await json(req);
  try {
    const message =
      b.action === "skip"
        ? await factory.skip(dec(m[1]), dec(m[2]))
        : factory.resume(dec(m[1]), dec(m[2]), typeof b.choice === "string" ? b.choice : undefined);
    ok(res, message);
  } catch (e) {
    refuse(res, e);
  }
});

on("POST", "/api/temporal/approve/{project}/{issue}", async (req, res, m) => {
  try {
    ok(res, factory.approve(dec(m[1]), dec(m[2]), (await json(req)) as Record<string, string>));
  } catch (e) {
    refuse(res, e);
  }
});

on("POST", "/api/projects/{project}/scan", async (_q, res, m) => {
  const project = dec(m[1]);
  await factory.refresh();
  const started = await factory.pickup(project);
  send(res, 200, {
    message: started.length ? `picked up ${started.map((s) => `#${s.split("#")[1]}`).join(", ")}` : factory.live(project) ? `${project}'s floor is held — nothing new starts until it is free` : `nothing in ${project}'s TO-DO to pick up`,
    started,
  });
});

on("POST", "/api/projects/{project}/enabled", async (req, res) => {
  const raw = await body(req);
  forward(req, res, raw, () => void factory.refresh().then(() => factory.emit("engine")));
});

on("POST", "/api/messages/{project}/answer", async (req, res, m) => {
  const b = await json(req);
  try {
    ok(res, factory.answer(dec(m[1]), String(b.token ?? ""), String(b.answer ?? "")));
  } catch (e) {
    refuse(res, e);
  }
});

on("POST", "/api/messages/{project}/suggestion", async (req, res, m) => {
  const b = await json(req);
  try {
    ok(res, factory.approveSuggestion(dec(m[1]), String(b.token ?? "")));
  } catch (e) {
    refuse(res, e);
  }
});

const GATE = new Set(["merge", "adjust", "address", "review", "discard"]);

on("POST", "/api/act/{name}", async (req, res, m) => {
  const name = dec(m[1]);
  const raw = await body(req);
  let params: Record<string, unknown> = {};
  try {
    params = ((JSON.parse(raw.toString("utf8") || "{}") as { params?: Record<string, unknown> }).params ?? {}) as Record<string, unknown>;
  } catch {
    /* a body the rig will refuse in its own words */
  }
  const project = String(params.project ?? "");
  const issue = String(params.issue ?? "").replace(/^#/, "");
  try {
    if (GATE.has(name)) return ok(res, factory.gate(project, issue, name, String(params.instruction ?? "")), { project, issue });
    if (name === "stop") return ok(res, factory.stop(project, issue, String(params.reason ?? "")), { project, issue });
    if (name === "ask") {
      factory.askTechLead(project, String(params.question ?? ""));
      return ok(res, "asked — the tech-lead answers in this project's chat", { project });
    }
    if (name.startsWith("product_") && product.handles(name)) return ok(res, ...(await product.act(name, params)));
    if (name === "product_board") {
      // The role reads the rig's board; the columns a job sets are the simulator's, as on the board.
      const up = await fetch(new URL(`/api/act/${name}`, BACKEND), { method: "POST", headers: { "content-type": "application/json" }, body: raw.toString("utf8") });
      const out = (await up.json().catch(() => null)) as { data?: { cards?: { ref: string; column: string; started?: boolean }[] } } | null;
      for (const c of out?.data?.cards ?? []) {
        const held = factory.columnOf(project, c.ref);
        if (held) Object.assign(c, { column: held, started: true });
      }
      return send(res, up.status, out);
    }
    if (name === "card_move") {
      const held = factory.columnOf(project, issue);
      if (held) {
        throw new Refused(409, held === "Done"
          ? `#${issue} is done — a card a job finished is closed, not moved. Nothing was changed.`
          : `a job holds #${issue} (${held}) — stop, skip or discard it first, which tell its job. Nothing was changed.`);
      }
    }
  } catch (e) {
    return refuse(res, e);
  }
  // Every other row is the rig's; a card or a project it changes is read again at once.
  forward(req, res, raw, () => {
    if (name.startsWith("card_") || name.startsWith("project_")) void factory.refresh();
  });
});

// ── previews ─────────────────────────────────────────────────────────────────────────────────

on("GET", "/api/preview/{project}/{unit}", (_q, res, m) => send(res, 200, previews.read(dec(m[1]), dec(m[2]))));
on("POST", "/api/preview/{project}/{unit}/{verb}", (_q, res, m) => {
  try {
    send(res, 200, previews.act(dec(m[1]), dec(m[2]), dec(m[3])));
  } catch (e) {
    refuse(res, e);
  }
});

// ── the product area ─────────────────────────────────────────────────────────────────────────

for (const [method, pattern, h] of product.routes()) on(method, pattern, h);

// ── the simulator's own controls ─────────────────────────────────────────────────────────────

on("GET", "/__sim", (_q, res) =>
  send(res, 200, {
    speed: factory.speed,
    backend: BACKEND,
    live: factory.jobs.filter((j) => j.status === "running").map(engineRow),
    outcomes: ["merge_human", "merge_rejected", "merge_auto", "decision", "repair_then_merge", "rate_limit", "fail_hold", "prod_approval", "wedged"],
  }),
);
on("POST", "/__sim/speed", (_q, res, _m, url) => {
  factory.speed = Math.max(0.25, Math.min(20, Number(url.searchParams.get("x") ?? 1)));
  send(res, 200, { speed: factory.speed });
});
on("POST", "/__sim/force", (_q, res, _m, url) => {
  const project = url.searchParams.get("project") ?? "";
  factory.force(project, (url.searchParams.get("outcome") ?? "merge_human") as Outcome);
  send(res, 200, { project, next: url.searchParams.get("outcome") });
});
on("POST", "/__sim/stage", async (_q, res, _m, url) => {
  const project = url.searchParams.get("project") ?? "";
  send(res, 200, { project, started: await factory.startNow(project, (url.searchParams.get("outcome") ?? "merge_human") as Outcome) });
});
on("POST", "/__sim/pickup", async (_q, res) => {
  await factory.refresh();
  send(res, 200, { started: await factory.pickup() });
});

// ── the server ───────────────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  for (const [method, re, h] of routes) {
    if (method !== req.method) continue;
    const m = url.pathname.match(re);
    if (!m) continue;
    try {
      await h(req, res, m, url);
    } catch (e) {
      if (!res.headersSent) refuse(res, e);
    }
    return;
  }
  forward(req, res);
});

// The floor's socket: projects and the tech-lead's conversation, as they change (`/api/stream`).
const floorSockets = new WebSocketServer({ noServer: true });
floorSockets.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let project = url.searchParams.get("project") ?? "";
  let last: Record<string, string> = {};
  const snapshot = async () => {
    const projects = await fetch(new URL("/api/v1/projects", BACKEND)).then((r) => (r.ok ? r.json() : null)).catch(() => null) as Record<string, unknown>[] | null;
    return {
      projects: projects ? projects.map(provenBox) : null,
      chat: project
        ? { project, messages: factory.chat.get(project) ?? [], pending: (factory.pending.get(project) ?? []).map((q) => ({ token: q.token, text: q.text, ts: q.ts, options: q.options })), suggestion: factory.suggestion.get(project) ?? null }
        : null,
    };
  };
  const push = async (full = false) => {
    const snap = await snapshot();
    const frame: Record<string, unknown> = { kind: "update", project };
    let changed = false;
    for (const [k, v] of Object.entries(snap)) {
      const s = JSON.stringify(v);
      if (full || last[k] !== s) {
        frame[k] = v;
        last = { ...last, [k]: s };
        changed = true;
      }
    }
    if (changed && ws.readyState === ws.OPEN) ws.send(JSON.stringify(frame));
  };
  ws.send(JSON.stringify({ kind: "hello", tick: 2.0 }));
  void push(true);
  const timer = setInterval(() => void push(), 2000);
  const onChat = (p: string) => p === project && void push();
  factory.on("chat", onChat);
  ws.on("message", (data) => {
    try {
      const m = JSON.parse(String(data)) as { project?: string };
      if (typeof m.project === "string") {
        project = m.project;
        last = {};
        void push(true);
      }
    } catch {
      /* a frame that is not JSON is ignored, as the server does */
    }
  });
  ws.on("close", () => {
    clearInterval(timer);
    factory.off("chat", onChat);
  });
});

server.on("upgrade", (req, socket, head) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path === "/api/stream") return floorSockets.handleUpgrade(req, socket, head, (ws) => floorSockets.emit("connection", ws, req));
  if (path === "/api/product/stream") return product.upgrade(req, socket, head);
  socket.destroy();
});

// SIM_FORCE="tidepool-mobile=decision,quarry-api=prod_approval" sets each line's next run.
for (const pair of (process.env.SIM_FORCE ?? "").split(",").filter(Boolean)) {
  const [project, outcome] = pair.split("=");
  if (project && outcome) factory.force(project.trim(), outcome.trim() as Outcome);
}

await factory.refresh();
setInterval(() => factory.tick(), 250);
setInterval(() => void factory.refresh(), 4000);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[sim] factory simulator on http://127.0.0.1:${PORT} (speed ${factory.speed}x) over ${BACKEND}`);
  console.log(`[sim] the default panel, on the same floor: http://127.0.0.1:${PORT}/`);
});
