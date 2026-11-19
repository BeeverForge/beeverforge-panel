// The scripts a simulated job follows. Each one walks the real stations in the real order and
// writes the journal lines a real run writes (`observability/events.py` kinds), at a pace a person
// can watch. Durations are seconds at speed 1; the factory divides them by its speed.
import type { Decision, Outcome, Review, Step } from "./types.ts";

interface Stack {
  lang: string;
  src: string;
  test: string;
  gates: string[];
}

const STACKS: Record<string, Stack> = {
  "harbour-ledger": { lang: "python", src: "src/ledger", test: "tests", gates: ["lint", "type", "security", "tests"] },
  "tidepool-mobile": { lang: "kotlin", src: "app/src/main/kotlin/reef", test: "app/src/test/kotlin/reef", gates: ["lint", "tests", "build"] },
  "quarry-api": { lang: "go", src: "internal/orders", test: "internal/orders", gates: ["lint", "vet", "security", "tests", "migrations"] },
  "atlas-docs": { lang: "markdown", src: "docs", test: "tests", gates: ["lint", "links", "build"] },
};

const stackOf = (project: string): Stack =>
  STACKS[project] ?? { lang: "python", src: "src", test: "tests", gates: ["lint", "tests"] };

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .split("_")
    .slice(0, 3)
    .join("_");

function file(stack: Stack, title: string, test = false) {
  const base = slug(title);
  switch (stack.lang) {
    case "kotlin":
      return test ? `${stack.test}/${base}Test.kt` : `${stack.src}/${base}.kt`;
    case "go":
      return test ? `${stack.src}/${base}_test.go` : `${stack.src}/${base}.go`;
    case "markdown":
      return test ? `${stack.test}/test_${base}.py` : `${stack.src}/${base}.md`;
    default:
      return test ? `${stack.test}/test_${base}.py` : `${stack.src}/${base}.py`;
  }
}

/** A seeded generator, so one card's run reads the same every time the simulator starts. */
export function random(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const MIX: [Outcome, number][] = [
  ["merge_human", 30],
  ["merge_auto", 18],
  ["decision", 16],
  ["repair_then_merge", 14],
  ["rate_limit", 8],
  ["fail_hold", 8],
  ["prod_approval", 6],
];

export function pickOutcome(seed: string, project: string): Outcome {
  // quarry-api releases behind a production approval: every merge there asks for one.
  const r = random(seed)() * 100;
  let acc = 0;
  for (const [outcome, weight] of MIX) {
    acc += weight;
    if (r < acc) return project === "quarry-api" && outcome === "merge_auto" ? "prod_approval" : outcome;
  }
  return "merge_human";
}

export function decisionFor(title: string, project: string): Decision {
  const stack = stackOf(project);
  const options =
    stack.lang === "go"
      ? [
          { key: "A", label: "Add the field to v2 only", consequence: "v1 clients keep today's response; the change ships this pass", recommended: true },
          { key: "B", label: "Add it to v1 and v2", consequence: "touches the frozen v1 schema; the contract tests for v1 must be regenerated" },
          { key: "C", label: "Stop and ask the API owner", consequence: "the card waits until somebody answers on the card" },
        ]
      : stack.lang === "kotlin"
        ? [
            { key: "A", label: "Cache on the device for 7 days", consequence: "works offline for a week; 40 MB cap enforced by eviction", recommended: true },
            { key: "B", label: "Cache only for the current visit", consequence: "smaller footprint; a visitor who returns tomorrow downloads again" },
          ]
        : [
            { key: "A", label: "Round half-even per line", consequence: "matches the criteria as written; totals may differ from the old report by a cent", recommended: true },
            { key: "B", label: "Round only the total", consequence: "keeps the old report's totals; lines no longer sum exactly" },
            { key: "C", label: "Leave it to finance", consequence: "parks the card until finance answers on it" },
          ];
  return {
    stage: "implementing",
    question:
      stack.lang === "go"
        ? `The card asks for a new field, but v1 and v2 share one serializer. Where should "${title.toLowerCase()}" land?`
        : stack.lang === "kotlin"
          ? "How long should the downloaded data stay on the visitor's phone?"
          : "Two readings of the rounding rule disagree on existing data. Which one is right?",
    context:
      "The acceptance criteria can be met two ways and they lead to different behaviour for data that already exists. The executor stopped instead of choosing.",
    options: options.map((o) => ({ recommended: false, ...o })),
    default: "A",
    advice: {
      take: "A",
      why: "It meets every criterion on the card without touching anything the card did not ask for.",
    },
  };
}

export function reviewFor(seed: string, rejected = false): Review {
  const rnd = random(`${seed}:review`);
  const score = rejected ? 4 + Math.floor(rnd() * 2) : 7 + Math.floor(rnd() * 3);
  const findings = rejected
    ? [
        { severity: "high", description: "The new path has no test for the empty case the card names.", file: "tests", line: 0 },
        { severity: "medium", description: "An error from the store is swallowed and logged at debug." },
      ]
    : score >= 9
      ? []
      : [{ severity: "low", description: "A helper duplicates an existing formatter; consider reusing it." }];
  return {
    word: rejected ? "Rejected" : "Approved",
    level: rejected ? "warn" : "ok",
    clause: rejected
      ? `the review rejected it (score ${score}/10) — read the findings before merging`
      : `the review approved it (score ${score}/10)`,
    points: findings.map((f) => f.description),
    score,
    decision: rejected ? "rejected" : "approved",
    summary: rejected
      ? "The change works for the main path but misses a case the card names."
      : "The change does what the card asks and is covered by tests.",
    findings,
  };
}

interface Ctx {
  project: string;
  issue: string;
  title: string;
  outcome: Outcome;
  twoStage: boolean;
  seed: string;
  /** The card has no acceptance criteria, so the spec check sends it back. */
  weakSpec: boolean;
}

export function stepsFor(ctx: Ctx): Step[] {
  const stack = stackOf(ctx.project);
  const src = file(stack, ctx.title);
  const test = file(stack, ctx.title, true);
  const rnd = random(ctx.seed);
  const n = (lo: number, hi: number) => Math.round(lo + rnd() * (hi - lo));

  const steps: Step[] = [
    { state: "sizing", seconds: 5, events: [{ kind: "note", message: "pre-flight: one small, testable outcome — no split needed" }], cost: 0.02 },
    { state: "spec_validation", seconds: 4, events: [{ kind: "note", message: ctx.weakSpec ? "the card has no acceptance criteria" : "objective and acceptance criteria present" }] },
  ];

  if (ctx.weakSpec) {
    steps.push({
      state: "needs_refinement",
      seconds: 1,
      park: "fail_hold",
      events: [{ kind: "warning", message: "sent back for refinement — the card says what to build but not how anyone would know it is done" }],
    });
    return steps;
  }

  steps.push({
    state: "preparing",
    seconds: 8,
    events: [
      { kind: "note", message: "cloned into a worktree box", data: { credential: { index: 1, total: 2, id: "pool-a", rotated: false } } },
      { kind: "note", message: `setup ran (${stack.lang === "go" ? "go mod download" : stack.lang === "kotlin" ? "./gradlew dependencies" : stack.lang === "markdown" ? "npm ci" : "pip install -e .[dev]"})` },
    ],
  });

  if (ctx.twoStage) {
    steps.push({
      state: "planning",
      seconds: 12,
      cost: 0.18,
      events: [
        { kind: "agent_action", message: `read ${stack.src}/ and the card's criteria`, data: { role: "planner" } },
        { kind: "agent_action", message: `plan: 1) failing test in ${test} 2) implement in ${src} 3) wire it up`, data: { role: "planner", cost_usd: 0.18 } },
      ],
    });
  }

  steps.push({
    state: "implementing",
    seconds: 36,
    cost: 0.0,
    events: [
      { kind: "agent_action", message: `read ${src.replace(/[^/]+$/, "")} — ${n(4, 11)} files`, data: { role: "executor" } },
      { kind: "agent_action", message: `wrote ${test} — ${n(3, 6)} tests, failing as expected`, data: { role: "executor" } },
      { kind: "agent_action", message: `implemented the change in ${src}`, data: { role: "executor" } },
      { kind: "note", message: "spent so far on this pass", data: { cost_usd: Number((0.4 + rnd() * 0.5).toFixed(2)) } },
      { kind: "agent_action", message: `ran the tests locally — ${n(18, 140)} passed`, data: { role: "executor" } },
    ],
  });

  if (ctx.outcome === "decision") {
    // The decision lands in the middle of the implementation, where a real executor meets it.
    steps.splice(steps.length - 1, 0, {
      state: "on_hold",
      seconds: 1,
      park: "decision",
      events: [{ kind: "warning", message: "parked on a decision — the criteria can be met two ways" }],
    });
  }

  if (ctx.outcome === "rate_limit") {
    steps.push({
      state: "paused",
      seconds: 25,
      park: "rate_limit",
      events: [{ kind: "warning", message: "the harness answered 429 — usage limit; retrying by itself" }],
    });
    steps.push({ state: "implementing", seconds: 8, events: [{ kind: "agent_action", message: "resumed where it stopped", data: { role: "executor" } }] });
  }

  const gateEvents = (failing?: string) =>
    stack.gates.map((g) => ({
      kind: "validation" as const,
      message: g === failing ? `${g} ✗ — ${g === "tests" ? `1 failed in ${test}` : "2 findings"}` : `${g} ✓`,
      data: { gate: g, passed: g !== failing },
    }));

  if (ctx.outcome === "repair_then_merge" || ctx.outcome === "fail_hold") {
    steps.push({ state: "validating", seconds: 14, events: gateEvents("tests") });
    steps.push({
      state: "repairing",
      seconds: 16,
      events: [
        { kind: "agent_action", message: `repair pass 1: the boundary case in ${test} expected the old behaviour`, data: { role: "executor", cost_usd: 0.21 } },
      ],
    });
    if (ctx.outcome === "fail_hold") {
      steps.push({ state: "validating", seconds: 10, events: gateEvents("tests") });
      steps.push({
        state: "on_hold",
        seconds: 1,
        park: "fail_hold",
        events: [{ kind: "error", message: `the tests gate failed after 2 repair passes — the last failure is in ${test}` }],
      });
      return steps;
    }
  }

  steps.push({ state: "validating", seconds: 14, events: gateEvents() });

  // merge_rejected is merge_human with the review's rejection decided, for a test that needs it.
  const rejected = ctx.outcome === "merge_rejected" || (ctx.outcome === "merge_human" && rnd() < 0.35);
  steps.push({
    state: "reviewing",
    seconds: 12,
    events: [{ kind: "review", message: "independent review", data: { cost_usd: 0.12, rejected } }],
  });
  steps.push({ state: "pr_open", seconds: 3, events: [{ kind: "pr", message: "pull request opened" }] });

  if (ctx.outcome === "wedged") {
    steps.push({ state: "running", seconds: 1, park: "wedged" });
    return steps;
  }

  const auto = ctx.outcome === "merge_auto" || ctx.outcome === "prod_approval";
  steps.push({ state: auto ? "merging" : "awaiting_your_merge", seconds: auto ? 14 : 1, park: auto ? undefined : "merge_gate" });
  steps.push({ state: "merged", seconds: 1, events: [{ kind: "note", message: "merged into main" }] });
  if (ctx.outcome === "prod_approval") {
    steps.push({ state: "awaiting_prod_approval", seconds: 1, park: "prod_approval" });
    steps.push({ state: "prod_releasing", seconds: 10, events: [{ kind: "note", message: "release tagged and deploying to production" }] });
    steps.push({ state: "done", seconds: 1, events: [{ kind: "note", message: "production deploy observed healthy" }] });
  }
  return steps;
}

/** The steps of one more agent pass on a pull request already open (adjust / address). */
export function passSteps(project: string, title: string, instruction: string): Step[] {
  const stack = stackOf(project);
  return [
    {
      state: "repairing",
      seconds: 18,
      events: [
        { kind: "agent_action", message: `another pass on the same branch — "${instruction.slice(0, 80)}"`, data: { role: "executor" } },
        { kind: "agent_action", message: `changed ${file(stack, title)}`, data: { role: "executor", cost_usd: 0.31 } },
      ],
    },
    { state: "validating", seconds: 10, events: stack.gates.map((g) => ({ kind: "validation" as const, message: `${g} ✓`, data: { gate: g, passed: true } })) },
    { state: "reviewing", seconds: 8, events: [{ kind: "review", message: "independent review", data: { cost_usd: 0.1, rejected: false } }] },
    { state: "awaiting_your_merge", seconds: 1, park: "merge_gate" },
    { state: "merged", seconds: 1, events: [{ kind: "note", message: "merged into main" }] },
  ];
}
