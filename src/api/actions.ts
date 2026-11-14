// Every write the panel makes. Each one resolves to the server's own sentence; a refusal rejects
// with it (`Refusal`), so the screen shows what the server said rather than a guess.
import { post, Refusal, seg } from "./http";
import type { ActResult } from "./types";

/** `POST /api/act/{name}` — a catalogued action. A refusal is the action's whole outcome. */
export async function act(name: string, params: Record<string, unknown>): Promise<ActResult> {
  const out = await post<ActResult>(`/api/act/${seg(name)}`, { params });
  if (out && out.ok === false) throw new Refusal(409, out);
  return out;
}

export type GateAnswer = "merge" | "review" | "adjust" | "address" | "discard";

export const answerGate = (project: string, issue: string, answer: GateAnswer, instruction?: string) =>
  act(answer, { project, issue, ...(instruction ? { instruction } : {}) });

/** A person's decision on a parked job: `resume` (with the option chosen) or `skip`. */
export const decide = (project: string, issue: string, action: "resume" | "skip", choice?: string) =>
  post<ActResult>(`/api/temporal/act/${seg(project)}/${seg(issue)}`, { action, ...(choice ? { choice } : {}) });

export const stopJob = (project: string, issue: string, reason: string) => act("stop", { project, issue, reason });

export const approveRelease = (
  project: string,
  issue: string,
  body: { approver: string; password: string; version: string; comment: string },
) => post<ActResult>(`/api/temporal/approve/${seg(project)}/${seg(issue)}`, body);

export const scan = (project: string) =>
  post<{ message?: string; started?: string[] }>(`/api/projects/${seg(project)}/scan`);

export const setPickup = (project: string, enabled: boolean) =>
  post<ActResult>(`/api/projects/${seg(project)}/enabled`, { enabled });

export const askTechLead = (project: string, question: string) => act("ask", { project, question });

export const answerQuestion = (project: string, token: string, answer: string) =>
  post<ActResult>(`/api/messages/${seg(project)}/answer`, { token, answer });

export const approveSuggestion = (project: string, token: string) =>
  post<ActResult>(`/api/messages/${seg(project)}/suggestion`, { token });

export const previewVerb = (project: string, unit: string, verb: "start" | "stop" | "rebuild" | "own_shape") =>
  post<{ state?: string; message?: string; detail?: string }>(`/api/preview/${seg(project)}/${seg(unit)}/${verb}`);

export const registerProject = (body: { name: string; repo_path: string; repo?: string; board_owner?: string; board_number?: string }) =>
  post<ActResult>("/api/projects", body);
