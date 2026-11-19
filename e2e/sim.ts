// The simulator's own controls, for tests that need a line to do a particular thing next.
const SIM = process.env.SIM_URL ?? "http://127.0.0.1:8790";

export async function simForce(project: string, outcome: string) {
  await fetch(`${SIM}/__sim/force?project=${encodeURIComponent(project)}&outcome=${outcome}`, { method: "POST" });
}

export async function simSpeed(x?: number): Promise<number> {
  if (x === undefined) return ((await (await fetch(`${SIM}/__sim`)).json()) as { speed: number }).speed;
  await fetch(`${SIM}/__sim/speed?x=${x}`, { method: "POST" });
  return x;
}

/** Ends what the project's line is doing and starts a card on `outcome` now (the simulator's stage control). */
export async function simStage(project: string, outcome: string) {
  const res = await fetch(`${SIM}/__sim/stage?project=${encodeURIComponent(project)}&outcome=${outcome}`, { method: "POST" });
  if (!res.ok) throw new Error(`the simulator could not stage ${outcome} on ${project}: ${res.status} ${await res.text()}`);
}

export async function simLive(): Promise<{ project: string; issue: string; state: string; action: { kind?: string } | null }[]> {
  const res = await fetch(`${SIM}/__sim`);
  return ((await res.json()) as { live: { project: string; issue: string; state: string; action: { kind?: string } | null }[] }).live;
}
