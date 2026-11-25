// The simulated worker and engine. It reads the rig's real projects and boards through the public
// API, picks cards up from TO-DO the way the poller does, and walks each one through a scripted run.
// The cards themselves stay where a person put them on the real board; the columns only a job may
// set (In progress, In review, Needs Review, Needs Action, Done) are this simulator's overlay.
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { decisionFor, passSteps, pickOutcome, random, reviewFor, stepsFor } from "./scenarios.ts";
import { isShipped } from "./fixtures.ts";
import type { Action, ChatMessage, Job, JournalEvent, Outcome, PendingQuestion, Step } from "./types.ts";

export interface BoardCard {
  ref: string;
  column: string;
  title: string;
  labels?: string[];
  updated_at?: string;
}

export interface ProjectRow {
  name: string;
  enabled?: boolean | null;
  [key: string]: unknown;
}

interface Pending {
  at: number;
  event: Omit<JournalEvent, "ts">;
}

const COLUMN_OF: Record<string, string> = {
  sizing: "In progress",
  spec_validation: "In progress",
  preparing: "In progress",
  planning: "In progress",
  implementing: "In progress",
  validating: "In progress",
  repairing: "In progress",
  reviewing: "In progress",
  paused: "In progress",
  running: "In progress",
  pr_open: "In review",
  merging: "In review",
  awaiting_your_merge: "Needs Review",
  on_hold: "Needs Action",
  needs_refinement: "Needs Action",
  merged: "Done",
  awaiting_prod_approval: "Done",
  prod_releasing: "Done",
  done: "Done",
};

const MODELS = ["claude-sonnet-4-5", "claude-opus-4-1", "gpt-5-codex"];
const HARNESSES = ["claude_code", "claude_code", "codex"];

export class Factory extends EventEmitter {
  speed: number;
  readonly backend: string;
  projects: ProjectRow[] | null = null;
  boards = new Map<string, BoardCard[]>();
  jobs: Job[] = [];
  chat = new Map<string, ChatMessage[]>();
  pending = new Map<string, PendingQuestion[]>();
  coordinator: { project: string; id: number; text: string; kind: string }[] = [];
  private queued = new Map<string, Pending[]>();
  private prSeq = new Map<string, number>();
  private forced = new Map<string, Outcome>();
  private cooldown = new Map<string, number>();
  private lastPickup = 0;
  private coordinatorSeq = 1;
  private booted = false;

  constructor(backend: string, speed: number) {
    super();
    this.backend = backend;
    this.speed = speed;
    this.setMaxListeners(200);
  }

  // ── the backend ───────────────────────────────────────────────────────────────────────────

  async read<T>(path: string): Promise<T> {
    const res = await fetch(`${this.backend}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`GET ${path} answered ${res.status}`);
    return (await res.json()) as T;
  }

  async act(name: string, params: Record<string, unknown>) {
    const res = await fetch(`${this.backend}/api/act/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ params }),
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  }

  async refresh() {
    try {
      this.projects = await this.read<ProjectRow[]>("/api/v1/projects");
    } catch (e) {
      console.warn(`[sim] could not read the projects: ${(e as Error).message}`);
      return;
    }
    await Promise.all(
      this.projects.map(async (p) => {
        try {
          const board = await this.read<{ cards: BoardCard[] | null }>(
            `/api/v1/board/${encodeURIComponent(p.name)}`,
          );
          if (board.cards) this.boards.set(p.name, board.cards);
        } catch {
          /* the last board read stands */
        }
      }),
    );
    if (!this.booted) {
      this.booted = true;
      this.bootHistory();
      this.emit("engine");
    }
  }

  // ── time ──────────────────────────────────────────────────────────────────────────────────

  private ms(seconds: number) {
    return (seconds * 1000) / this.speed;
  }

  private now() {
    return new Date().toISOString();
  }

  // ── history ───────────────────────────────────────────────────────────────────────────────

  private bootHistory() {
    let n = 0;
    for (const [project, cards] of this.boards) {
      for (const card of cards) {
        if (!isShipped(project, card.title)) continue;
        n++;
        const rnd = random(`${project}#${card.ref}:history`);
        const daysAgo = 1 + Math.floor(rnd() * 12);
        const runMin = 6 + Math.floor(rnd() * 22);
        const close = Date.now() - daysAgo * 86_400_000 - Math.floor(rnd() * 36_000_000);
        const start = close - runMin * 60_000;
        const job = this.newJob(project, card, "merge_auto", 1, true);
        job.status = "completed";
        job.state = "merged";
        job.start_time = new Date(start).toISOString();
        job.close_time = new Date(close).toISOString();
        job.deploy = "deployed";
        job.column = "Done";
        job.prNumber = this.nextPr(project);
        job.review = reviewFor(job.workflow_id);
        job.gates = this.gatesOf(project).map((name) => ({ name, passed: true }));
        // The journal of a finished run, laid out over the time it actually took.
        const lines = job.steps.flatMap((s) => [
          { kind: "state" as const, message: s.state },
          ...(s.events ?? []),
        ]);
        job.events = lines.map((e, i) => this.stamped(job, e, start + ((close - start) * i) / lines.length));
        job.cost = Number((0.6 + rnd() * 1.8).toFixed(2));
        this.jobs.push(job);
      }
    }
    console.log(`[sim] ${n} finished runs read back as history`);
  }

  private gatesOf(project: string) {
    return (
      {
        "harbour-ledger": ["lint", "type", "security", "tests"],
        "tidepool-mobile": ["lint", "tests", "build"],
        "quarry-api": ["lint", "vet", "security", "tests", "migrations"],
        "atlas-docs": ["lint", "links", "build"],
      }[project] ?? ["lint", "tests"]
    );
  }

  private nextPr(project: string) {
    const n = (this.prSeq.get(project) ?? 40) + 1;
    this.prSeq.set(project, n);
    return n;
  }

  // ── jobs ──────────────────────────────────────────────────────────────────────────────────

  private newJob(project: string, card: BoardCard, outcome: Outcome, attempt: number, history = false): Job {
    const seed = `${project}#${card.ref}#${attempt}`;
    const rnd = random(`${seed}:model`);
    const pick = Math.floor(rnd() * MODELS.length);
    return {
      workflow_id: `beeverforge-${project}-${card.ref}`,
      run_id: randomUUID(),
      project,
      issue: card.ref,
      title: card.title,
      status: "running",
      state: "sizing",
      action: null,
      start_time: this.now(),
      close_time: null,
      deploy: null,
      refused: "",
      outcome,
      steps: stepsFor({
        project,
        issue: card.ref,
        title: card.title,
        outcome,
        twoStage: project === "tidepool-mobile",
        seed,
        weakSpec: false,
      }),
      step: -1,
      stepEndsAt: 0,
      events: [],
      cost: 0,
      review: null,
      gates: [],
      repairs: 0,
      prNumber: null,
      attempt,
      model: MODELS[pick]!,
      harness: HARNESSES[pick]!,
      turns: 18 + Math.floor(rnd() * 60),
      tokens: 120_000 + Math.floor(rnd() * 900_000),
      knowledge: rnd() < 0.6 ? "injected" : "off",
      column: "In progress",
      history,
    };
  }

  live(project: string) {
    return this.jobs.find((j) => j.project === project && j.status === "running");
  }

  latest(project: string, issue: string) {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i]!;
      if (j.project === project && j.issue === issue) return j;
    }
    return undefined;
  }

  /** The column the factory holds a card in, or undefined when the real board's column stands. */
  columnOf(project: string, issue: string): string | undefined {
    const j = this.latest(project, issue);
    if (!j) return undefined;
    if (j.status === "running") return j.column;
    if (j.state === "merged" || j.state === "done") return "Done";
    return undefined;
  }

  async start(project: string, card: BoardCard, checkSpec = true): Promise<Job> {
    const attempt = this.jobs.filter((j) => j.project === project && j.issue === card.ref && !j.history).length + 1;
    const outcome = this.forced.get(project) ?? pickOutcome(`${project}#${card.ref}#${attempt}`, project);
    this.forced.delete(project);
    const job = this.newJob(project, card, outcome, attempt);
    // A card with no acceptance criteria goes back for refinement, as the spec check would send it.
    // A run started by `startNow` below skips the check, so its script runs as written.
    if (checkSpec) {
      try {
        const detail = await this.read<{ card?: { body?: string | null } | null }>(
          `/api/v1/board/${encodeURIComponent(project)}?card=${encodeURIComponent(`#${card.ref}`)}`,
        );
        const body = detail.card?.body ?? "";
        if (!/acceptance criteria/i.test(body) || !/^\s*[-*] /m.test(body)) {
          job.steps = stepsFor({ project, issue: card.ref, title: card.title, outcome, twoStage: project === "tidepool-mobile", seed: `${project}#${card.ref}#${attempt}`, weakSpec: true });
        }
      } catch {
        /* the card could not be read; the run goes on as scripted */
      }
    }
    this.jobs.push(job);
    this.enter(job, 0);
    this.narrate(project, `picked up #${card.ref} — ${card.title}`, "pickup");
    this.say(project, { kind: "told", text: `Picked up #${card.ref} · ${card.title}.` });
    console.log(`[sim] ${project} #${card.ref} started (${outcome})`);
    return job;
  }

  private stamped(job: Job, e: Omit<JournalEvent, "ts">, at = Date.now()): JournalEvent {
    const out: JournalEvent = {
      ts: new Date(at).toISOString(),
      job_id: job.workflow_id,
      ticket_id: job.issue,
      ...e,
      data: { ...(e.data ?? {}) },
    };
    if (e.kind === "review") {
      const rejected = Boolean(e.data?.rejected);
      const review = reviewFor(`${job.workflow_id}:${job.events.length}`, rejected);
      job.review = review;
      out.message = `review ${review.decision} — score ${review.score}/10`;
      out.data = { cost_usd: e.data?.cost_usd, score: review.score, decision: review.decision, detail: review.findings };
    }
    if (e.kind === "pr") {
      job.prNumber ??= this.nextPr(job.project);
      const url = `/p/${encodeURIComponent(job.project)}/pr/${job.prNumber}`;
      out.message = `opened pull request #${job.prNumber}`;
      out.data = { url };
    }
    if (e.kind === "validation" && typeof e.data?.gate === "string") {
      const name = e.data.gate as string;
      job.gates = [...job.gates.filter((g) => g.name !== name), { name, passed: Boolean(e.data.passed) }];
    }
    return out;
  }

  private append(job: Job, e: Omit<JournalEvent, "ts">) {
    const stamped = this.stamped(job, e);
    if (typeof stamped.data?.cost_usd === "number") job.cost = Number((job.cost + (stamped.data.cost_usd as number)).toFixed(2));
    job.events.push(stamped);
    this.emit("log", job, stamped);
    if (stamped.kind === "pr") {
      this.narrate(job.project, `opened pull request #${job.prNumber} for #${job.issue}`, "pr");
    }
  }

  private enter(job: Job, index: number) {
    const step = job.steps[index];
    if (!step) return this.finish(job);
    job.step = index;
    job.state = step.state;
    job.stepEndsAt = Date.now() + this.ms(step.seconds);
    job.column = COLUMN_OF[step.state] ?? job.column;
    if (step.state === "spec_validation") job.gates = [];
    this.append(job, { kind: "state", message: step.state });
    // The step's lines are written while it runs, not all at once.
    const lines = step.events ?? [];
    const span = this.ms(step.seconds);
    this.queued.set(
      job.run_id,
      lines.map((event, i) => ({ at: Date.now() + (span * (i + 1)) / (lines.length + 1), event })),
    );
    job.action = this.parkOf(job, step);
    if (step.state === "merging") {
      job.action = { kind: "merge_wait", pr_url: this.prUrl(job), auto: true, note: "waiting for CI", gate_live: true };
    }
    if (step.park === "decision") {
      this.ask(job);
    }
    if (step.park === "fail_hold") {
      this.say(job.project, { kind: "told", text: `#${job.issue} is on hold: ${job.action?.note ?? "it needs a person"}. Retrying from the top is the usual answer once the card is fixed.` });
      this.stage(job);
    }
    if (step.park === "merge_gate") {
      this.say(job.project, { kind: "told", text: `#${job.issue}'s pull request #${job.prNumber} is ready and waits for your review and merge.` });
    }
    this.emit("engine");
  }

  private prUrl(job: Job) {
    return `/p/${encodeURIComponent(job.project)}/pr/${job.prNumber ?? 0}`;
  }

  private parkOf(job: Job, step: Step): Action | null {
    const at = this.now();
    switch (step.park) {
      case "decision":
        return { kind: "decision", state: "on_hold", note: "decision needed", parked_at: at, wakes_at: null, attempts_spent: 1, decision: decisionFor(job.title, job.project) };
      case "rate_limit":
        return { kind: "rate_limit", state: "paused", note: "usage limit — the harness answered 429", parked_at: at, wakes_at: new Date(job.stepEndsAt).toISOString(), retry_at: null };
      case "fail_hold":
        return {
          kind: "impediment",
          state: step.state,
          note: step.state === "needs_refinement"
            ? "the card says what to build but not how anyone would know it is done — add acceptance criteria, then retry"
            : "the tests gate failed after 2 repair passes",
          cause: step.state === "needs_refinement" ? "requirement" : "code",
          parked_at: at,
          wakes_at: null,
          attempts_spent: 2,
        };
      case "merge_gate": {
        const passes = job.events.filter((e) => e.message.startsWith("another pass")).length;
        return {
          kind: "merge_wait",
          pr_url: this.prUrl(job),
          auto: false,
          gate_live: true,
          can_review: true,
          can_address: job.outcome === "merge_comments",
          adjust_passes: 2,
          adjusts_left: Math.max(0, 2 - passes),
          auto_but_for_the_look: false,
          note: "",
        };
      }
      default:
        return null;
    }
  }

  private finish(job: Job) {
    const last = job.steps[job.steps.length - 1];
    job.status = "completed";
    job.state = last?.state ?? "done";
    job.close_time = this.now();
    job.action = null;
    job.column = "Done";
    this.queued.delete(job.run_id);
    if (job.state === "merged" || job.state === "done") {
      job.deploy = "deploying";
      this.narrate(job.project, `merged #${job.issue} — watching the deploy`, "merge");
      this.say(job.project, { kind: "told", text: `Merged #${job.issue}. Watching the deploy.` });
      setTimeout(() => {
        job.deploy = "deployed";
        this.narrate(job.project, `#${job.issue} deployed`, "deploy");
        this.emit("engine");
      }, this.ms(18));
    }
    this.emit("engine");
  }

  private close(job: Job, state: string, note: string, status: Job["status"] = "completed") {
    this.append(job, { kind: "note", message: note });
    job.status = status;
    job.state = state;
    job.close_time = this.now();
    job.action = null;
    this.queued.delete(job.run_id);
    this.cooldown.set(`${job.project}#${job.issue}`, Date.now() + this.ms(90));
    this.pending.set(job.project, (this.pending.get(job.project) ?? []).filter((q) => q.issue !== job.issue));
    this.emit("engine");
    this.emit("chat", job.project);
  }

  /** One tick of the floor: due journal lines, finished steps, wake-ups and pickup. */
  tick() {
    const now = Date.now();
    for (const job of this.jobs) {
      if (job.status !== "running") continue;
      const queue = this.queued.get(job.run_id);
      while (queue && queue.length && queue[0]!.at <= now) this.append(job, queue.shift()!.event);
      const step = job.steps[job.step];
      if (!step) continue;
      const parked = step.park && step.park !== "rate_limit";
      if (!parked && now >= job.stepEndsAt && !(queue && queue.length)) {
        this.enter(job, job.step + 1);
      }
    }
    if (now - this.lastPickup > this.ms(20)) {
      this.lastPickup = now;
      void this.pickup();
    }
  }

  async pickup(only?: string): Promise<string[]> {
    const started: string[] = [];
    for (const p of this.projects ?? []) {
      if (only && p.name !== only) continue;
      if (!only && p.enabled === false) continue;
      if (this.live(p.name)) continue;
      const cards = this.boards.get(p.name) ?? [];
      const next = cards.find(
        (c) =>
          c.column === "TO-DO" &&
          !this.columnOf(p.name, c.ref) &&
          (this.cooldown.get(`${p.name}#${c.ref}`) ?? 0) < Date.now(),
      );
      if (!next) continue;
      await this.start(p.name, next);
      started.push(`${p.name}#${next.ref}`);
    }
    return started;
  }

  // ── what a person answers ─────────────────────────────────────────────────────────────────

  find(project: string, issue: string) {
    const j = this.latest(project, issue.replace(/^#/, ""));
    return j && j.status === "running" ? j : undefined;
  }

  resume(project: string, issue: string, choice?: string): string {
    const job = this.find(project, issue);
    if (!job?.action || job.action.kind === "merge_wait") throw new Refused(409, `#${issue} is not parked — there is nothing to resume`);
    const kind = job.action.kind;
    this.pending.set(project, (this.pending.get(project) ?? []).filter((q) => q.issue !== job.issue));
    if (kind === "decision") {
      const opt = job.action.decision?.options.find((o) => o.key === choice) ?? job.action.decision?.options[0];
      this.append(job, { kind: "note", message: `resumed with ${opt?.key} · ${opt?.label}` });
      job.action = null;
      this.enter(job, job.step + 1);
      this.emit("chat", project);
      return `resumed #${job.issue} with ${opt?.key} · ${opt?.label}`;
    }
    if (kind === "rate_limit") {
      this.append(job, { kind: "note", message: "retried now instead of waiting for the backoff" });
      job.action = null;
      this.enter(job, job.step + 1);
      return `retrying #${job.issue} now`;
    }
    // An impediment re-runs the card from the top, on a fresh script that gets through.
    this.append(job, { kind: "note", message: "resumed by a person — running again from the spec check" });
    job.steps = stepsFor({ project, issue: job.issue, title: job.title, outcome: "merge_human", twoStage: project === "tidepool-mobile", seed: `${job.workflow_id}:retry${job.events.length}`, weakSpec: false });
    job.action = null;
    this.enter(job, 1);
    this.emit("chat", project);
    return `resumed #${job.issue} — it runs again from the top`;
  }

  async skip(project: string, issue: string): Promise<string> {
    const job = this.find(project, issue);
    if (!job) throw new Refused(409, `#${issue} has no live job to skip`);
    this.close(job, "skipped", "skipped by a person — the card goes back to Backlog");
    await this.act("card_move", { project, issue: job.issue, column: "Backlog" });
    await this.refresh();
    return `skipped #${job.issue} — the floor is free and the card is back in Backlog`;
  }

  gate(project: string, issue: string, answer: string, instruction = ""): string {
    const job = this.find(project, issue);
    const act = job?.action;
    if (!job || !act || act.kind !== "merge_wait" || act.auto) {
      throw new Refused(409, `#${issue} is not waiting at its merge gate`);
    }
    if (act.working) throw new Refused(409, `a pass is already running on #${issue}'s pull request — it asks again when the pass ends`);
    switch (answer) {
      case "merge":
        this.append(job, { kind: "note", message: "merge asked for by a person" });
        // The gate step is a park; it becomes a timed merge, entered in its place.
        job.steps = [...job.steps.slice(0, job.step), { state: "merging", seconds: 6 }, ...job.steps.slice(job.step + 1)];
        this.enter(job, job.step);
        return `merging #${job.issue}`;
      case "adjust":
      case "address": {
        if (act.adjusts_left === 0) throw new Refused(409, `no pass is left on #${issue} — a person decides now`);
        const words = answer === "address" ? "address the review comments on the pull request" : instruction || "another pass";
        job.steps = [...job.steps.slice(0, job.step + 1), ...passSteps(project, job.title, words)];
        job.action = null;
        this.enter(job, job.step + 1);
        job.action = { ...act, working: true, note: "a pass is rewriting the pull request" };
        this.emit("engine");
        return `sent #${job.issue} back for one more pass`;
      }
      case "review":
        this.append(job, { kind: "review", message: "re-review", data: { cost_usd: 0.09, rejected: false } });
        this.emit("engine");
        return `re-reviewed #${job.issue} — the verdict on the card is replaced`;
      case "discard":
        this.close(job, "skipped", "pull request closed without merging — the branch and its commits stay");
        void this.act("card_move", { project, issue: job.issue, column: "Backlog" }).then(() => this.refresh());
        return `discarded #${job.issue}'s pull request — the floor is free`;
      default:
        throw new Refused(400, `'${answer}' is not an answer the merge gate takes`);
    }
  }

  stop(project: string, issue: string, reason: string): string {
    const job = this.find(project, issue);
    if (!job) throw new Refused(409, `#${issue} has no live job to stop`);
    this.close(job, "failed", `stopped by a person${reason ? ` — ${reason}` : ""}; the card stays on the board`, "terminated");
    return `stopped #${job.issue} — the floor is free`;
  }

  approve(project: string, issue: string, body: { approver?: string; password?: string; version?: string }): string {
    const job = this.find(project, issue);
    if (!job || job.state !== "awaiting_prod_approval") throw new Refused(409, `#${issue} is not waiting for a production approval`);
    if (!body.approver || !body.password) throw new Refused(400, "an approval needs the approver's login and password");
    if (!body.version) throw new Refused(400, "an approval needs the version to release");
    this.append(job, { kind: "note", message: `production release ${body.version} approved by ${body.approver}` });
    this.enter(job, job.step + 1);
    return `approved — ${body.version} is releasing`;
  }

  force(project: string, outcome: Outcome) {
    this.forced.set(project, outcome);
  }

  /** For a test that needs one state now, not after whatever the line is doing ends: ends the
   *  project's live job and starts its first TO-DO card (or its first card) on `outcome`, skipping
   *  the spec check so the script runs as written. */
  async startNow(project: string, outcome: Outcome): Promise<string> {
    await this.refresh();
    const live = this.live(project);
    if (live) this.close(live, "skipped", "ended by the simulator's stage control");
    const cards = this.boards.get(project) ?? [];
    const card = cards.find((c) => c.column === "TO-DO") ?? cards[0];
    if (!card) throw new Refused(409, `${project} has no card the simulator can stage`);
    this.force(project, outcome);
    const job = await this.start(project, card, false);
    return `#${job.issue}`;
  }

  // ── the tech-lead ─────────────────────────────────────────────────────────────────────────

  narrate(project: string, text: string, kind: string) {
    this.coordinator.push({ project, id: this.coordinatorSeq++, text, kind });
    if (this.coordinator.length > 60) this.coordinator.shift();
    this.emit("coordinator");
  }

  say(project: string, m: Omit<ChatMessage, "ts">) {
    const list = this.chat.get(project) ?? [];
    list.push({ ...m, ts: this.now() });
    if (list.length > 80) list.shift();
    this.chat.set(project, list);
    this.emit("chat", project);
  }

  private ask(job: Job) {
    const d = job.action?.decision;
    if (!d) return;
    const list = this.pending.get(job.project) ?? [];
    list.push({
      token: randomUUID(),
      text: `#${job.issue}: ${d.question}`,
      ts: this.now(),
      options: d.options.map((o) => ({ key: o.key, label: o.label })),
      issue: job.issue,
    });
    this.pending.set(job.project, list);
    this.say(job.project, { kind: "told", text: `#${job.issue} stopped on a decision. My read: ${d.advice?.take} — ${d.advice?.why}` });
  }

  suggestion = new Map<string, { token: string; action: string; issue: string; params: Record<string, unknown>; labels: Record<string, string>; live: boolean; reason: string }>();

  private stage(job: Job) {
    this.suggestion.set(job.project, {
      token: randomUUID(),
      action: "resume",
      issue: job.issue,
      params: { project: job.project, issue: job.issue },
      labels: { action: "Retry from the top", issue: `#${job.issue}` },
      live: true,
      reason: "",
    });
  }

  answer(project: string, token: string, answer: string): string {
    const q = (this.pending.get(project) ?? []).find((p) => p.token === token);
    if (!q) throw new Refused(409, "that question was already answered");
    this.say(project, { kind: "answered", text: answer, token });
    return this.resume(project, q.issue, answer);
  }

  approveSuggestion(project: string, token: string): string {
    const s = this.suggestion.get(project);
    if (!s || s.token !== token) throw new Refused(409, "that suggestion is no longer staged");
    this.suggestion.delete(project);
    this.say(project, { kind: "answered", text: `▶ ${s.labels.action} ${s.labels.issue}`, token });
    return this.resume(project, s.issue);
  }

  askTechLead(project: string, question: string) {
    this.say(project, { kind: "said", text: question, by: "you" });
    const live = this.live(project);
    const reply = live
      ? `#${live.issue} (${live.title}) is at ${live.state.replaceAll("_", " ")}; it has cost $${live.cost.toFixed(2)} so far.${live.action?.kind === "merge_wait" && !live.action.auto ? " Its pull request waits for your review." : ""}`
      : `Nothing is running on ${project}. The next card in TO-DO starts at the next pickup.`;
    setTimeout(() => this.say(project, { kind: "told", text: reply }), this.ms(4));
  }
}

export class Refused extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
