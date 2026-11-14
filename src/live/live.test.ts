import { describe, expect, it } from "vitest";
import { changedJobs, mergeEngineFrame } from "./engine";
import { positionFromLog, positionOf, stationsFor } from "./pipeline";
import type { EngineJob, EngineRead, JournalEvent } from "../api/types";

const job = (over: Partial<EngineJob> = {}): EngineJob => ({
  workflow_id: "beeverforge-p-1",
  run_id: "r1",
  project: "p",
  issue: "1",
  status: "running",
  state: "implementing",
  action: null,
  ...over,
});

describe("an engine frame", () => {
  it("keeps what it omits", () => {
    const prev: EngineRead = { connected: true, intake: { schedule: "on" }, build: { agree: true }, jobs: [job()] };
    const merged = mergeEngineFrame(prev, { connected: true, jobs: [job({ state: "validating" })] });
    expect(merged.intake).toEqual({ schedule: "on" });
    expect(merged.build).toEqual({ agree: true });
    expect(merged.jobs?.[0]?.state).toBe("validating");
  });

  it("keeps the last list when the engine could not be read", () => {
    const prev: EngineRead = { connected: true, jobs: [job()] };
    const merged = mergeEngineFrame(prev, { connected: false, jobs: null });
    expect(merged.jobs).toHaveLength(1);
  });

  it("names exactly the cards whose job changed", () => {
    const a = job();
    const b = job({ run_id: "r2", project: "q", issue: "7" });
    expect([...changedJobs([a, b], [a, { ...b, state: "reviewing" }])]).toEqual(["q#7"]);
    expect([...changedJobs([a], [a])]).toEqual([]);
  });
});

describe("where a job stands", () => {
  const single = stationsFor(true);
  const two = stationsFor(false);

  it("a single-agent line has no planner", () => {
    expect(single.map((s) => s.label)).not.toContain("Plan");
    expect(two.map((s) => s.label)).toContain("Plan");
  });

  it("reads the station from the engine row", () => {
    expect(positionOf(job({ state: "validating" }), single)).toEqual({ at: 3, mode: "running" });
    expect(positionOf(job({ state: "repairing" }), single).at).toBe(3);
  });

  it("a merge gate holds at Merge, and a decision holds where it was asked", () => {
    const gate = job({ state: "awaiting_your_merge", action: { kind: "merge_wait", auto: false }, attention: true });
    expect(positionOf(gate, single)).toEqual({ at: single.length - 1, mode: "held" });
    const asked = job({ state: "on_hold", attention: true, action: { kind: "decision", decision: { stage: "implementing" } } });
    expect(positionOf(asked, single)).toEqual({ at: 2, mode: "held" });
  });

  it("an impediment with no station keeps the last one seen", () => {
    const held = job({ state: "on_hold", attention: true, action: { kind: "impediment" } });
    expect(positionOf(held, single, 3)).toEqual({ at: 3, mode: "held" });
  });

  it("a re-run starts its strip again at the spec check", () => {
    const log: JournalEvent[] = [
      { kind: "state", message: "spec_validation" },
      { kind: "state", message: "implementing" },
      { kind: "state", message: "reviewing" },
      { kind: "note", message: "cost", data: { cost_usd: 0.5 } },
      { kind: "state", message: "spec_validation" },
      { kind: "state", message: "preparing" },
    ];
    const p = positionFromLog(log, single);
    expect(p.at).toBe(1);
    expect(p.mode).toBe("running");
    expect(p.cost).toBe(0.5);
  });
});
