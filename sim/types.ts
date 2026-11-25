// The simulator's own model of a job. What leaves the simulator is shaped by views.ts into the
// API's published shapes (docs/reference/openapi.json, events.schema.json).

export type Status = "running" | "completed" | "failed" | "terminated";

export interface JournalEvent {
  ts: string;
  job_id?: string;
  ticket_id?: string;
  kind: "state" | "agent_action" | "validation" | "review" | "pr" | "note" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface DecisionOption {
  key: string;
  label: string;
  consequence: string;
  recommended: boolean;
}

export interface Decision {
  stage: string;
  question: string;
  context: string;
  options: DecisionOption[];
  default: string;
  advice: { take: string; why: string } | null;
}

/** What a live job is parked on, in the engine's own shape (`awaiting_action` / `awaiting_merge`). */
export interface Action {
  kind: "merge_wait" | "rate_limit" | "impediment" | "decision";
  state?: string;
  note?: string;
  cause?: string;
  parked_at?: string;
  wakes_at?: string | null;
  retry_at?: string | null;
  attempts_spent?: number;
  decision?: Decision | null;
  // merge_wait
  pr_url?: string;
  auto?: boolean;
  working?: boolean;
  gate_live?: boolean;
  can_review?: boolean;
  can_address?: boolean;
  adjust_passes?: number;
  adjusts_left?: number;
  auto_but_for_the_look?: boolean;
}

export interface Review {
  word: string;
  level: "ok" | "warn" | "unknown";
  clause: string;
  points: string[];
  score: number;
  decision: "approved" | "rejected";
  summary: string;
  findings: { severity: string; description: string; file?: string; line?: number }[];
}

export type Outcome =
  | "merge_human"
  | "merge_rejected"
  | "merge_comments"
  | "merge_auto"
  | "decision"
  | "repair_then_merge"
  | "rate_limit"
  | "fail_hold"
  | "prod_approval"
  | "wedged";

/** One step of a job's script: a station to enter, how long it lasts, and what it writes. */
export interface Step {
  state: string;
  seconds: number;
  events?: Omit<JournalEvent, "ts">[];
  /** Spent while this step runs, in dollars. */
  cost?: number;
  /** A step that parks the job until a person (or a clock) answers it. */
  park?: "decision" | "rate_limit" | "fail_hold" | "merge_gate" | "prod_approval" | "wedged";
}

export interface Job {
  workflow_id: string;
  run_id: string;
  project: string;
  issue: string;
  title: string;
  status: Status;
  state: string;
  action: Action | null;
  start_time: string;
  close_time: string | null;
  deploy: string | null;
  refused: string;
  outcome: Outcome;
  steps: Step[];
  step: number;
  stepEndsAt: number;
  events: JournalEvent[];
  cost: number;
  review: Review | null;
  gates: { name: string; passed: boolean }[];
  repairs: number;
  prNumber: number | null;
  attempt: number;
  model: string;
  harness: string;
  turns: number;
  tokens: number;
  knowledge: "injected" | "off";
  /** The board column the factory has put the card in. */
  column: string;
  history?: boolean;
}

export interface ChatMessage {
  kind: "said" | "answered" | "told";
  text: string;
  ts: string;
  token?: string;
  by?: string;
}

export interface PendingQuestion {
  token: string;
  text: string;
  ts: string;
  options: { key: string; label: string }[];
  issue: string;
}
