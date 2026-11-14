// The simulator's state, read back in the API's own published shapes. Each function names the
// route it answers and follows the server code it stands in for, so a front end cannot tell the
// difference from the shape alone.
import type { Factory } from "./factory.ts";
import type { Job } from "./types.ts";
import { random } from "./scenarios.ts";

const ATTENTION = new Set([
  "failed",
  "needs_refinement",
  "on_hold",
  "blocked",
  "paused",
  "awaiting_prod_approval",
  "awaiting_your_merge",
]);

const isWedged = (j: Job) => j.status === "running" && j.steps[j.step]?.park === "wedged";

/** One row of `/api/v1/temporal/jobs` (`view._enriched`). */
export function engineRow(j: Job) {
  const live = j.status === "running";
  return {
    workflow_id: j.workflow_id,
    run_id: j.run_id,
    project: j.project,
    issue: j.issue,
    title: j.title,
    status: j.status,
    state: j.state,
    action: j.action ? { ...j.action } : null,
    attention: live && ATTENTION.has(j.state),
    wedged: isWedged(j),
    start_time: j.start_time,
    close_time: j.close_time,
    temporal_url: "",
    refused: j.refused,
    deploy: j.deploy,
  };
}

/** `/api/v1/temporal/jobs`, and the frame `/api/temporal/stream` sends. */
export function engineFrame(f: Factory) {
  const jobs = [...f.jobs]
    .sort((a, b) => (b.close_time ?? b.start_time).localeCompare(a.close_time ?? a.start_time))
    .slice(0, 50)
    .map(engineRow);
  return {
    connected: true,
    address: "the panel-next simulator",
    ui_base: "",
    ui_hint: "the simulator has no engine UI — set TEMPORAL_UI_URL on a real deployment",
    jobs,
    intake: {
      schedule: "on",
      every_s: Math.round(20 / f.speed),
      fired_ago_s: 3,
      next_at: new Date(Date.now() + 20_000 / f.speed).toISOString(),
    },
    build: { agree: true, stamp: "sim", built_at: null, others: {} },
  };
}

// ── what needs a person (`/api/v1/inbox`) ─────────────────────────────────────────────────────

function needKind(j: Job): string {
  const act = j.action;
  if (act?.decision) return "decision";
  if (j.state === "awaiting_your_merge") return "merge";
  if (j.state === "awaiting_prod_approval") return "approval";
  if (act?.kind === "rate_limit") return "rate_limit";
  if (isWedged(j)) return "wedged";
  return "impediment";
}

function waitsOnAPerson(j: Job) {
  if (j.status !== "running") return false;
  if (isWedged(j)) return true;
  if (j.action?.kind === "merge_wait") return !j.action.auto && !j.action.working;
  if (j.action?.kind === "rate_limit") return true;
  return ATTENTION.has(j.state);
}

function verdictOf(j: Job) {
  const r = j.review;
  if (!r) return { word: "", level: "unknown", clause: "no review yet", points: [] };
  return { word: r.word, level: r.level, clause: r.clause, points: r.points };
}

export function inbox(f: Factory) {
  const out: Record<string, unknown>[] = [];
  for (const j of f.jobs) {
    if (!waitsOnAPerson(j)) continue;
    const act = j.action ?? {};
    const base = {
      project: j.project,
      issue: j.issue,
      title: j.title,
      state: j.state,
      note: (act as { note?: string }).note ?? "",
      pr_url: (act as { pr_url?: string }).pr_url ?? null,
      review: verdictOf(j),
      parked_at: (act as { parked_at?: string }).parked_at ?? null,
      wakes_at: (act as { wakes_at?: string | null }).wakes_at ?? null,
      retry_at: null,
    };
    const actUrl = `/api/temporal/act/${j.project}/${j.issue}`;
    const kind = needKind(j);
    if (j.action?.decision) {
      out.push({ ...base, kind, decision: j.action.decision, answer: { method: "POST", url: actUrl, body: { action: "resume", choice: "<option key>" } } });
    } else if (j.state === "awaiting_your_merge") {
      const a = j.action!;
      let options: Record<string, unknown>[] = [
        { key: "merge", label: "Merge", consequence: "lands the PR — the forge may still refuse it if branch protection says so, and the job will say why" },
        { key: "adjust", label: "Adjust", needs_text: true, consequence: "one more agent pass on the SAME branch and PR, against your own words" },
        { key: "discard", label: "Discard", consequence: "closes the PR without merging and frees the floor; the branch and its commits are untouched" },
      ];
      if (a.adjusts_left === 0) options = options.filter((o) => o.key !== "adjust");
      if (a.can_review) {
        options.splice(1, 0, { key: "review", label: "Re-review", consequence: "reads the pull request AS IT STANDS and replaces the verdict on this card — it changes no code, and it costs a model pass" });
      }
      out.push({ ...base, kind, options, answer: { method: "POST", url: "/api/act/<merge|adjust|address|discard|review>", body: { params: { project: j.project, issue: j.issue, instruction: "<adjust only>" } } } });
    } else if (j.state === "awaiting_prod_approval") {
      out.push({ ...base, kind, answer: { method: "POST", url: `/api/temporal/approve/${j.project}/${j.issue}` } });
    } else if (j.state === "paused") {
      out.push({ ...base, kind, answer: { method: "POST", url: actUrl, body: { action: "resume | skip" } } });
    } else if (isWedged(j)) {
      out.push({
        ...base,
        kind,
        note: "it has been running for hours with no gate and no park — nothing left can advance it",
        options: [{ key: "stop", label: "Stop — free the floor", consequence: "ends the run and puts the card back; the branch and any commits are untouched" }],
        answer: { method: "POST", url: "/api/act/stop", body: { params: { project: j.project, issue: j.issue, reason: "<why>" } } },
      });
    } else {
      out.push({
        ...base,
        kind,
        options: [
          { key: "resume", label: "Retry from the top" },
          { key: "skip", label: "Skip — free the floor" },
        ],
        answer: { method: "POST", url: actUrl, body: { action: "resume | skip" } },
      });
    }
  }
  return out;
}

export function decisions(f: Factory) {
  return f.jobs
    .filter((j) => j.status === "running" && j.action?.decision)
    .map((j) => ({ project: j.project, issue: j.issue, title: j.title, state: j.state, decision: j.action!.decision }));
}

// ── the floor (`/api/v1/floor[/{project}]`, `floor.ladder`) ───────────────────────────────────

interface Cause {
  rung: number;
  cause: string;
  clause: string;
  kind: "working" | "armed" | "clock" | "needs" | "stopped" | "unknown";
  project: string;
  pinned?: boolean;
  cmd?: string;
  detail?: string;
  meta?: string;
  actions?: Record<string, unknown>[];
}

const WORDS: Record<Cause["kind"], [string, string, string]> = {
  working: ["Working", "Working", "ok"],
  armed: ["Armed", "Armed", "ok"],
  clock: ["Waiting on a clock", "Waiting", "clock"],
  needs: ["Needs you", "Needs you", "warn"],
  stopped: ["Stopped", "Stopped", "err"],
  unknown: ["Unknown", "Unknown", "unknown"],
};

const NEED_PHRASE: Record<string, string> = {
  decision: "a decision is waiting for your answer",
  merge: "its pull request waits for your review and merge",
  approval: "a production release waits for your approval",
  rate_limit: "it is parked on a usage limit",
  wedged: "it has been running with no gate and no park — only Stop frees the floor",
  impediment: "it stopped and will not restart by itself",
};

function causes(f: Factory, project = ""): Cause[] {
  const out: Cause[] = [];
  const jobs = f.jobs.filter((j) => !project || j.project === project);
  const rows = (f.projects ?? []).filter((p) => !project || p.name === project);
  for (const p of rows) {
    if (p.enabled === false) {
      out.push({
        rung: 4, cause: "pickup_off", kind: "stopped", project: p.name, pinned: true,
        clause: `pickup for ${p.name} is off — a card in TO-DO will not be taken, whatever the engine is doing`,
        actions: [{ key: "enable", label: "Turn pickup on", tone: "primary", project: p.name }],
      });
    }
  }
  const needs = jobs.filter(waitsOnAPerson).filter((j) => j.action?.kind !== "rate_limit");
  if (needs.length) {
    const first = needs[0]!;
    out.push({
      rung: 5, cause: "needs_you", kind: "needs", project: first.project, pinned: true,
      clause: needs.length > 1
        ? `${needs.length} answers are waiting — the oldest is ${first.project} #${first.issue}`
        : `${first.project} #${first.issue} — ${NEED_PHRASE[needKind(first)]}`,
      actions: [{ key: "inbox", label: needs.length > 1 ? "Answer them" : "Answer it", tone: "primary" }],
    });
  }
  for (const j of jobs) {
    if (j.status !== "running") continue;
    if (j.action?.kind === "rate_limit") {
      const at = j.action.wakes_at ? new Date(j.action.wakes_at).toISOString().slice(11, 16) : "";
      out.push({ rung: 6, cause: "rate_park", kind: "clock", project: j.project, clause: `${j.project} #${j.issue} is parked on a usage limit${at ? ` — it retries by itself at ${at} UTC` : " — it retries by itself"}` });
    } else if (j.action?.kind === "merge_wait" && j.action.auto) {
      out.push({ rung: 6, cause: "merge_auto", kind: "clock", project: j.project, clause: `${j.project} #${j.issue} is merging itself — waiting on CI` });
    }
  }
  // An action payload is not always a question: a merge wait with a pass in flight is work.
  const reallyRunning = jobs.filter(
    (j) =>
      j.status === "running" &&
      !isWedged(j) &&
      !ATTENTION.has(j.state) &&
      (!j.action || (j.action.kind === "merge_wait" && j.action.working)),
  );
  if (reallyRunning.length > 1) {
    out.push({ rung: 7, cause: "running", kind: "working", project: "", clause: `${reallyRunning.length} cards in production — ${reallyRunning.slice(0, 2).map((j) => `${j.project} #${j.issue}`).join(", ")}` });
  } else if (reallyRunning.length === 1) {
    const one = reallyRunning[0]!;
    out.push({ rung: 7, cause: "running", kind: "working", project: one.project, clause: `${one.project} #${one.issue} · ${one.title}` });
  }
  if (!out.length || out.every((c) => c.rung >= 8)) {
    const where = project ? ` in ${project}'s TO-DO` : " in TO-DO";
    out.push({
      rung: 9, cause: "armed", kind: "armed", project,
      clause: `nothing is running — the next card${where} will be picked up`,
      meta: `the poller last fired 3s ago · it ticks every ${Math.round(20 / f.speed)}s`,
    });
  }
  return out;
}

function state(f: Factory, project = "") {
  const found = causes(f, project).sort((a, b) => a.rung - b.rung || a.project.localeCompare(b.project));
  const win = found[0]!;
  const rest = found.slice(1);
  const pinned = rest.filter((c) => c.pinned);
  const plain = rest.filter((c) => !c.pinned);
  const also = [...pinned, ...plain.slice(0, 3)];
  const [word, short, level] = WORDS[win.kind];
  return {
    scope: project,
    word, short, level,
    rung: win.rung,
    cause: win.cause,
    clause: win.clause,
    line: `${word} — ${win.clause}`,
    detail: win.detail ?? "",
    cmd: win.cmd ?? "",
    meta: win.meta ?? "",
    actions: win.actions ?? [],
    also: also.map((c) => ({ level: WORDS[c.kind][2], word: WORDS[c.kind][0], clause: c.clause, cause: c.cause, project: c.project, cmd: c.cmd ?? "", pinned: Boolean(c.pinned) })),
    also_more: Math.max(0, rest.length - also.length),
  };
}

export function floor(f: Factory, project = "") {
  const one = state(f, project);
  if (project || !f.projects) return { ...one, census: null, census_line: "", per_project: null, ok: one.level === "ok" };
  const census: Record<string, number> = { working: 0, needs: 0, clock: 0, armed: 0, stopped: 0, unknown: 0, total: 0 };
  const per: Record<string, unknown> = {};
  for (const p of f.projects) {
    const s = state(f, p.name);
    per[p.name] = { word: s.word, short: s.short, level: s.level, cause: s.cause, clause: s.clause, cmd: s.cmd };
    const bucket = { ok: s.cause === "armed" ? "armed" : "working", clock: "clock", warn: "needs", err: "stopped", unknown: "unknown" }[s.level]!;
    census[bucket]! += 1;
    census.total! += 1;
  }
  const label: Record<string, string> = { working: "working", needs: "needs you", clock: "waiting", armed: "armed", stopped: "stopped", unknown: "unknown" };
  const census_line = ["working", "needs", "clock", "armed", "stopped", "unknown"].filter((k) => census[k]).map((k) => `· ${census[k]} ${label[k]}`).join(" ");
  return { ...one, census, census_line, per_project: per, ok: one.level === "ok" };
}

// ── one job (`/api/v1/jobs/{project}/{issue}/detail`, `view.job_detail`) ─────────────────────

const WHY: Record<string, string> = {
  merged: "Merged — every gate passed, the review didn't reject it, and the merge policy allowed it.",
  done: "Released — merged, approved for production and observed healthy.",
  skipped: "Skipped by a person — the floor was freed and the card went back to Backlog.",
  failed: "Stopped by a person — the card stays on the board and a fresh run starts from the beginning.",
};

export function jobDetail(f: Factory, project: string, issue: string) {
  const j = f.latest(project, issue);
  if (!j) return { project, issue, workflow_id: `beeverforge-${project}-${issue}`, error: "job not found: the engine holds no run for this card" };
  const out: Record<string, unknown> = {
    project, issue, workflow_id: j.workflow_id,
    status: j.status, title: j.title, temporal_url: "",
    runtime_ms: j.close_time ? new Date(j.close_time).getTime() - new Date(j.start_time).getTime() : null,
    state: j.state,
    review: j.review ? { score: j.review.score, decision: j.review.decision, summary: j.review.summary, findings: j.review.findings } : null,
    ci_checks: [],
    ci_provider: "none",
    pr_url: j.prNumber ? `/p/${encodeURIComponent(j.project)}/pr/${j.prNumber}` : null,
  };
  if (j.status === "running") {
    out.action = j.action;
    out.refused = j.refused;
    out.why =
      j.state === "awaiting_your_merge"
        ? j.review?.decision === "rejected"
          ? `The independent review REJECTED it (score ${j.review.score}). ${j.review.summary}`
          : "Handed to human review — the project's merge policy requires a human, or a high-risk component was touched."
        : j.action?.note || "Still running.";
    out.cost_usd = j.cost;
    out.gates = j.gates;
    return out;
  }
  return {
    ...out,
    cost_usd: j.cost,
    note: j.events.filter((e) => e.kind === "note").at(-1)?.message ?? null,
    repair_attempts: j.events.filter((e) => e.kind === "state" && e.message === "repairing").length,
    suppressions: [],
    added_suppressions: [],
    gates: j.gates,
    why: WHY[j.state] ?? j.state,
    deploy: j.deploy,
  };
}

/** `/api/v1/jobs` — the journals on disk, newest first (`JournalJob`). */
export function journalJobs(f: Factory) {
  const latest = new Map<string, Job>();
  for (const j of f.jobs) latest.set(`${j.project}#${j.issue}`, j);
  return [...latest.values()]
    .map((j) => ({
      project: j.project,
      issue: j.issue,
      state: j.state,
      updated: j.events.at(-1)?.ts ?? j.start_time,
      events: j.events.length,
      pr_url: j.prNumber ? `/p/${encodeURIComponent(j.project)}/pr/${j.prNumber}` : null,
      cost_usd: j.cost,
    }))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

/** The pull request a simulated job opened, as `/api/v1/board/{p}?pr=` answers (`PullRequestDetail`). */
export function pullRequest(f: Factory, project: string, ref: string) {
  const n = Number(ref.replace(/^#/, ""));
  const j = [...f.jobs].reverse().find((x) => x.project === project && x.prNumber === n);
  if (!j) return null;
  const merged = j.state === "merged" || j.state === "done";
  const open = j.status === "running";
  const file = j.events.find((e) => e.message.startsWith("implemented the change in"))?.message.replace("implemented the change in ", "") ?? "src/change.py";
  return {
    ref: `#${n}`,
    state: merged ? "merged" : open ? "open" : "closed",
    readable: true,
    body: `Closes #${j.issue} — ${j.title}\n\n${j.review ? `**Review:** ${j.review.decision}, score ${j.review.score}/10. ${j.review.summary}` : ""}`,
    diff: `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -12,6 +12,14 @@\n-    return rows\n+    # ${j.title}\n+    if not rows:\n+        return []\n+    return [normalise(r) for r in rows]\n`,
    events: [
      { kind: "opened", by: "beeverforge-bot", at: j.events.find((e) => e.kind === "pr")?.ts ?? j.start_time },
      ...(j.review ? [{ kind: "review", by: "reviewer", at: j.events.find((e) => e.kind === "review")?.ts, said: j.review.summary }] : []),
      ...(merged ? [{ kind: "merged", by: "beeverforge-bot", at: j.close_time }] : []),
    ],
    refused: "",
    can_merge_here: open && j.state === "awaiting_your_merge",
  };
}

// ── spend (`/api/v1/metrics`, `metrics_view.cost_dashboard`) ──────────────────────────────────

export function metrics(f: Factory, project: string | null) {
  const names = (f.projects ?? []).map((p) => p.name);
  const scope = project && names.includes(project) ? project : names[0] ?? "";
  // A month of earlier work, invented and stable, under the runs this simulator watched.
  const rnd = random(`metrics:${scope}`);
  const tasks: Record<string, unknown>[] = [];
  const runs: Record<string, unknown>[] = [];
  const models = ["claude-sonnet-4-5", "claude-opus-4-1", "gpt-5-codex"];
  const harnesses = ["claude_code", "claude_code", "codex"];
  for (let d = 30; d >= 1; d--) {
    const day = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    const count = Math.floor(rnd() * 3);
    for (let k = 0; k < count; k++) {
      const pick = Math.floor(rnd() * 3);
      const knowledge = d > 22 ? null : rnd() < 0.55 ? "injected" : "off";
      const tokens = Math.round((knowledge === "injected" ? 260_000 : 380_000) * (0.5 + rnd()));
      const cost = Number(((tokens / 1_000_000) * (pick === 1 ? 6.2 : 2.9)).toFixed(2));
      const ticket = String(100 + d * 3 + k);
      tasks.push({
        ticket, title: `Earlier card ${ticket}`, date: day, model: models[pick], harness: harnesses[pick], knowledge,
        turns: 14 + Math.floor(rnd() * 50), wall_s: 420 + Math.floor(rnd() * 2400), cost_usd: cost,
        tokens, input_tokens: Math.round(tokens * 0.86), output_tokens: Math.round(tokens * 0.14),
      });
      runs.push({ model: models[pick], harness: harnesses[pick], role: "executor", date: day, ticket, cost_usd: Number((cost * 0.8).toFixed(2)) });
      runs.push({ model: models[pick], harness: harnesses[pick], role: "reviewer", date: day, ticket, cost_usd: Number((cost * 0.2).toFixed(2)) });
    }
  }
  for (const j of f.jobs.filter((x) => x.project === scope && x.cost > 0)) {
    const day = j.start_time.slice(0, 10);
    tasks.push({
      ticket: j.issue, title: j.title, date: day, model: j.model, harness: j.harness, knowledge: j.knowledge,
      turns: j.turns, wall_s: j.close_time ? Math.round((new Date(j.close_time).getTime() - new Date(j.start_time).getTime()) / 1000) : null,
      cost_usd: j.cost, tokens: j.tokens, input_tokens: Math.round(j.tokens * 0.86), output_tokens: Math.round(j.tokens * 0.14),
    });
    runs.push({ model: j.model, harness: j.harness, role: "executor", date: day, ticket: j.issue, cost_usd: Number((j.cost * 0.85).toFixed(2)) });
    runs.push({ model: j.model, harness: j.harness, role: "reviewer", date: day, ticket: j.issue, cost_usd: Number((j.cost * 0.15).toFixed(2)) });
  }
  const sum = (key: string) =>
    runs.reduce<Record<string, number>>((acc, r) => {
      const k = String(r[key]);
      acc[k] = Number(((acc[k] ?? 0) + Number(r.cost_usd)).toFixed(2));
      return acc;
    }, {});
  const total = runs.reduce((s, r) => s + Number(r.cost_usd), 0);
  const walls = tasks.map((t) => Number(t.wall_s)).filter((x) => x > 0);
  const measured = tasks.filter((t) => t.knowledge).length;
  const clean = Math.round(measured * 0.62);
  return {
    projects: names,
    project: scope,
    runs,
    tasks,
    by_day: sum("date"),
    by_model: sum("model"),
    by_harness: sum("harness"),
    by_role: sum("role"),
    totals: {
      cost_usd: Number(total.toFixed(2)),
      tokens: tasks.reduce((s, t) => s + Number(t.tokens), 0),
      tasks: tasks.length,
      avg_cost_per_task: tasks.length ? Number((total / tasks.length).toFixed(2)) : 0,
      avg_wall_s: walls.length ? Math.round(walls.reduce((a, b) => a + b, 0) / walls.length) : null,
      agent_runs: runs.length,
    },
    knowledge_ab: null,
    autonomy: {
      project: scope,
      readable: true,
      measured,
      first_pass: clean,
      yield: measured ? Number((clean / measured).toFixed(4)) : null,
      code_passes: Math.round(measured * 1.46),
      rework_rate: measured ? 1.46 : null,
      repair_depth: { "0": clean, "1": Math.round(measured * 0.24), "2": Math.round(measured * 0.1), "3+": Math.max(0, measured - clean - Math.round(measured * 0.24) - Math.round(measured * 0.1)) },
      before_the_record: ["3", "7"],
      parks: 9,
      park_reasons: { requirement: 4, code: 3, transient: 2 },
      said: {
        title: `${scope} — autonomy, read from the card record`,
        headline: `${clean} of ${measured} measured cards reached their merge with no repair pass and nobody stepping in — ${measured ? Math.round((clean / measured) * 100) : 0}%.`,
        rework: `${Math.round(measured * 1.46)} passes wrote code for them: 1.46 per card, where 1 is a single pass each.`,
        before_the_record: "2 merged card(s) left out: the record does not hold their promotion before their merge.",
        scope: "Measurement starts with cards promoted from 0.5.0 on; older cards never enter a rate.",
        parks: "9 park(s), classified from the recorded note.",
        labels: {
          title: "Autonomy — from the card record", yield: "merged untouched", rework: "code passes per card",
          measured: "measured merges", before: "before the record", depth: "repair passes per card",
          repairs: "repair passes", cards: "cards", parks: "why cards parked — classified from the recorded note",
          cause: "cause", count: "parks",
        },
        causes: {
          transient: "passes on its own", credential: "a credential", environment: "infrastructure",
          requirement: "the ticket itself", code: "the change", policy: "an organisation rule",
          project: "the project's own configuration", tree: "a working copy in the way",
          gate: "a check only a person settles", unknown: "nobody could tell",
        },
      },
    },
  };
}
