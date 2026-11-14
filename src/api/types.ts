// The API's shapes, named for the screen. `generated/openapi.ts` is the contract; these restate
// the fields the panel reads, because the contract types every model as `fields & {[k]: unknown}`
// and many nested objects as plain dicts the server fills (cited beside each).
import type { components } from "./generated/openapi";

type Schemas = components["schemas"];
type N<T> = T | null | undefined;

export type WhoamiRead = Schemas["WhoamiRead"];
export type PromoteRead = Schemas["PromoteRead"];
export type BudgetRead = Schemas["BudgetRead"];
export type VersionRead = Schemas["VersionRead"];

/** `box_prove.health` */
export interface BoxHealth {
  state?: string;
  gate?: string;
  detail?: string;
  at?: string;
  image?: string;
  sandbox?: string;
}

/** `/api/v1/projects` (`ProjectRow`) */
export interface ProjectRow {
  name?: N<string>;
  repo_path?: N<string>;
  tracker?: N<string>;
  forge?: N<string>;
  ci?: N<string>;
  board?: N<string | number>;
  enabled?: N<boolean>;
  box?: N<BoxHealth>;
}

/** The floor's levels (`floor.ladder.WORDS`). */
export type FloorLevel = "ok" | "clock" | "warn" | "err" | "unknown";

export interface FloorCause {
  level: FloorLevel;
  word: string;
  clause: string;
  cause: string;
  project: string;
  cmd: string;
  pinned: boolean;
}

export interface FloorAction {
  key: string;
  label: string;
  tone?: string;
  project?: string;
}

export interface FloorVerdict {
  word: string;
  short: string;
  level: FloorLevel;
  cause: string;
  clause: string;
  cmd: string;
}

/** `/api/v1/floor[/{project}]` (`floor.ladder.FloorState`) */
export interface FloorRead {
  scope?: N<string>;
  word?: N<string>;
  short?: N<string>;
  level?: N<FloorLevel>;
  rung?: N<number>;
  cause?: N<string>;
  clause?: N<string>;
  line?: N<string>;
  detail?: N<string>;
  cmd?: N<string>;
  meta?: N<string>;
  actions?: N<FloorAction[]>;
  also?: N<FloorCause[]>;
  also_more?: N<number>;
  census?: N<Record<"working" | "needs" | "clock" | "armed" | "stopped" | "unknown" | "total", number>>;
  census_line?: N<string>;
  per_project?: N<Record<string, FloorVerdict>>;
  ok?: N<boolean>;
}

export interface DecisionOption {
  key: string;
  label: string;
  consequence?: string;
  recommended?: boolean;
}

/** `contracts/decision.py::DecisionRequest` */
export interface Decision {
  stage?: string;
  question?: string;
  context?: string;
  options?: DecisionOption[];
  default?: string;
  advice?: { take?: string; why?: string } | null;
}

/** `JobWorkflow.awaiting_action` / `awaiting_merge` (`runtime/temporal/workflow.py`) */
export interface JobAction {
  kind?: string;
  state?: string;
  note?: string;
  cause?: string;
  parked_at?: N<string>;
  wakes_at?: N<string>;
  retry_at?: N<string>;
  decision?: N<Decision>;
  pr_url?: string;
  auto?: boolean;
  working?: boolean;
  gate_live?: boolean;
  can_review?: boolean;
  can_address?: boolean;
  adjust_passes?: number;
  adjusts_left?: number;
}

/** One row of `/api/v1/temporal/jobs` (`view._enriched`). */
export interface EngineJob {
  workflow_id?: N<string>;
  run_id?: N<string>;
  project?: N<string>;
  issue?: N<string>;
  title?: N<string>;
  status?: N<string>;
  state?: N<string>;
  action?: N<JobAction>;
  attention?: N<boolean>;
  wedged?: N<boolean>;
  start_time?: N<string>;
  close_time?: N<string>;
  temporal_url?: N<string>;
  refused?: N<string>;
  deploy?: N<string>;
}

export interface EngineRead {
  connected?: N<boolean>;
  jobs?: N<EngineJob[]>;
  address?: N<string>;
  ui_base?: N<string>;
  ui_hint?: N<string>;
  error?: N<string>;
  intake?: N<Record<string, unknown>>;
  build?: N<{ agree?: boolean; stamp?: string; built_at?: N<string>; others?: Record<string, { stamp?: string }> }>;
}

export interface ReviewVerdict {
  word?: string;
  level?: string;
  clause?: string;
  points?: string[];
}

export interface InboxOption {
  key: string;
  label?: string;
  consequence?: string;
  needs_text?: boolean;
  recommended?: boolean;
}

/** `/api/v1/inbox` — `kind` is `floor.ladder.need_kind`. */
export interface InboxItem {
  project?: N<string>;
  issue?: N<string>;
  title?: N<string>;
  state?: N<string>;
  kind?: N<string>;
  note?: N<string>;
  pr_url?: N<string>;
  review?: N<ReviewVerdict>;
  parked_at?: unknown;
  wakes_at?: unknown;
  decision?: N<Decision>;
  options?: N<InboxOption[]>;
  accepted?: N<{ said?: string }>;
}

/** One line of a run's journal (`observability/events.py::JobEvent`). */
export interface JournalEvent {
  ts?: string;
  kind?: string;
  message?: string;
  job_id?: string;
  ticket_id?: string;
  data?: {
    url?: string;
    role?: string;
    cost_usd?: number;
    gate?: string;
    passed?: boolean;
    score?: number;
    decision?: string;
    detail?: { severity?: string; description?: string; file?: string; line?: number }[];
    credential?: { index?: number; total?: number; id?: string; rotated?: boolean };
    [key: string]: unknown;
  };
}

/** `/api/v1/jobs` (`JournalJob`) */
export interface JournalJob {
  project?: N<string>;
  issue?: N<string>;
  state?: N<string>;
  updated?: N<string>;
  events?: N<number>;
  pr_url?: N<string>;
  cost_usd?: N<number>;
}

export interface Finding {
  severity?: string;
  description?: string;
  file?: string;
  line?: number;
}

/** `/api/v1/jobs/{project}/{issue}/detail` (`view.job_detail`) */
export interface JobDetail {
  project?: string;
  issue?: string;
  workflow_id?: string;
  error?: string;
  connected?: boolean;
  status?: string;
  title?: string;
  state?: string;
  runtime_ms?: N<number>;
  cost_usd?: N<number>;
  review?: N<{ score?: number; decision?: string; summary?: string; findings?: Finding[] }>;
  repair_attempts?: N<number>;
  why?: string;
  note?: N<string>;
  suppressions?: { kind?: string; file?: string; snippet?: string }[];
  gates?: { name?: string; passed?: boolean }[];
  ci_provider?: string;
  ci_checks?: { name?: string; bucket?: string; advisory?: boolean; kind?: string; remedy?: string }[];
  pr_url?: N<string>;
  temporal_url?: string;
  deploy?: N<string>;
  action?: N<JobAction>;
}

export interface CardComment {
  author?: N<string>;
  body?: N<string>;
  created_at?: N<string>;
}

/** The card a person opened (`BoardRead.card`, plus `catalog.card_view`'s words and flags). */
export interface CardDetail {
  ref?: N<string>;
  readable?: N<boolean>;
  title?: N<string>;
  body?: N<string>;
  comments?: N<CardComment[]>;
  state?: N<string>;
  opened_by_product?: N<string>;
  started?: boolean;
  finished?: boolean;
  removes?: boolean;
  open?: boolean;
  words?: Record<string, string>;
}

export interface PullRequest {
  ref?: N<string>;
  state?: N<string>;
  readable?: N<boolean>;
  body?: N<string>;
  diff?: N<string>;
  events?: N<{ kind?: string; by?: string; at?: string; said?: string }[]>;
  refused?: N<string>;
  can_merge_here?: N<boolean>;
}

export interface BoardCard {
  ref?: N<string>;
  column?: N<string>;
  title?: N<string>;
  labels?: N<string[]>;
  updated_at?: N<string>;
}

/** `/api/v1/board/{project}` — `columns`/`cards` are null when the board could not be read. */
export interface BoardRead {
  project?: N<string>;
  columns?: N<string[]>;
  cards?: N<BoardCard[]>;
  poll_seconds?: N<number>;
  board?: N<boolean>;
  card?: N<CardDetail>;
  pr?: N<PullRequest>;
}

export interface CoordinatorMessage {
  project?: N<string>;
  id?: N<number>;
  text?: N<string>;
  kind?: N<string>;
}

export interface ChannelMessage {
  kind?: N<string>;
  text?: N<string>;
  ts?: N<string>;
  token?: N<string>;
  answer?: N<string>;
  by?: N<string>;
}

export interface PendingQuestion {
  token?: N<string>;
  text?: N<string>;
  ts?: N<string>;
  options?: N<{ key?: N<string>; label?: N<string>; consequence?: N<string> }[]>;
}

export interface StagedSuggestion {
  token?: N<string>;
  action?: N<string>;
  issue?: N<string>;
  params?: N<Record<string, unknown>>;
  labels?: N<Record<string, string>>;
  live?: N<boolean>;
  reason?: N<string>;
}

/** `/api/v1/messages/{project}` */
export interface MessagesRead {
  project?: N<string>;
  messages?: N<ChannelMessage[]>;
  pending?: N<PendingQuestion[]>;
  suggestion?: N<StagedSuggestion>;
}

/** `/api/factory/{project}` — the cockpit (deliberately unversioned). */
export interface Cockpit {
  pickup_enabled?: N<boolean>;
  single_agent?: boolean;
  tokens?: { count?: number; source?: string; ids?: string[] };
  models?: Record<string, string>;
  harness?: string;
  auth_format?: string;
  auth_credential?: string;
  review_mode?: string;
  region?: string;
  links?: Record<string, string>;
  engine_ui_hint?: string;
  hosted_boards?: string[];
}

/** `POST /api/act/{name}` */
export interface ActResult {
  ok: boolean;
  message?: string;
  code?: string;
  data?: Record<string, unknown>;
  detail?: string;
}

export interface MetricsTask {
  ticket: string;
  title?: string;
  date: string;
  model?: string;
  harness?: string;
  knowledge?: N<string>;
  turns?: number;
  wall_s?: N<number>;
  cost_usd?: number;
  tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface MetricsRun {
  model?: string;
  harness?: string;
  role?: string;
  date: string;
  ticket: string;
  cost_usd?: number;
}

export interface Autonomy {
  readable?: boolean;
  measured?: number;
  yield?: N<number>;
  rework_rate?: N<number>;
  repair_depth?: Record<string, number>;
  before_the_record?: string[];
  park_reasons?: Record<string, number>;
  said?: {
    title?: string;
    headline?: string;
    rework?: string;
    before_the_record?: string;
    scope?: string;
    parks?: string;
    labels?: Record<string, string>;
    causes?: Record<string, string>;
  };
}

export interface MetricsRead {
  projects?: N<string[]>;
  project?: N<string>;
  runs?: N<MetricsRun[]>;
  tasks?: N<MetricsTask[]>;
  totals?: N<{ cost_usd?: N<number>; tokens?: N<number>; tasks?: N<number>; avg_cost_per_task?: N<number>; avg_wall_s?: N<number>; agent_runs?: N<number> }>;
  autonomy?: N<Autonomy>;
}

export interface PreviewService {
  name?: string;
  url?: string;
  health?: string;
  from_change?: boolean;
}

export interface PreviewRead {
  unit?: string;
  live?: boolean;
  state?: string;
  starting?: boolean;
  headline?: string;
  why?: string;
  services?: PreviewService[];
  can_start?: boolean;
  expires_at?: string;
  started_at?: string;
  started_by?: string;
  stale?: string[];
  missing?: string[];
  notes?: string[];
}
