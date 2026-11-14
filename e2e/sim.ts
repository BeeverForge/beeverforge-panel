// The simulator's own controls, for tests that need a line to do a particular thing next.
const SIM = process.env.SIM_URL ?? "http://127.0.0.1:8790";

export async function simForce(project: string, outcome: string) {
  await fetch(`${SIM}/__sim/force?project=${encodeURIComponent(project)}&outcome=${outcome}`, { method: "POST" });
}

export async function simSpeed(x: number) {
  await fetch(`${SIM}/__sim/speed?x=${x}`, { method: "POST" });
}

export async function simLive(): Promise<{ project: string; issue: string; state: string; action: { kind?: string } | null }[]> {
  const res = await fetch(`${SIM}/__sim`);
  return ((await res.json()) as { live: { project: string; issue: string; state: string; action: { kind?: string } | null }[] }).live;
}
