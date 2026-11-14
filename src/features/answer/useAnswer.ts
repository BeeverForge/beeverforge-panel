// Every answer a person gives the floor, in one place: what it sends, what the card shows while it
// travels, and the server's own sentence when it lands or is refused.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../../api/actions";
import { keys } from "../../api/queries";
import type { ProjectRow } from "../../api/types";
import { toast } from "../../ui/toast";
import { jobKey, usePending } from "./pending";

const said = (e: unknown) => (e instanceof Error ? e.message : "it did not say why");

interface Target {
  project: string;
  issue: string;
}

function useRun<V extends Target>(label: (v: V) => string, send: (v: V) => Promise<{ message?: string }>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onMutate: (v: V) => usePending.getState().start(jobKey(v.project, v.issue), label(v)),
    onSuccess: (out, v) => {
      toast.ok(`${v.project} #${v.issue}`, out?.message || label(v));
      void client.invalidateQueries({ queryKey: keys.inbox });
      void client.invalidateQueries({ queryKey: ["floor"] });
      // The frame that confirms it clears the card; this is the backstop if none comes.
      window.setTimeout(() => usePending.getState().clear(jobKey(v.project, v.issue)), 20_000);
    },
    onError: (e, v) => {
      usePending.getState().clear(jobKey(v.project, v.issue));
      toast.alarm(`${v.project} #${v.issue} — not done`, said(e));
    },
  });
}

const GATE_LABEL: Record<api.GateAnswer, string> = {
  merge: "Merging",
  review: "Re-reviewing",
  adjust: "Sending back for a pass",
  address: "Addressing the comments",
  discard: "Discarding",
};

export function useAnswer() {
  return {
    decide: useRun<Target & { action: "resume" | "skip"; choice?: string; label?: string }>(
      (v) => (v.action === "skip" ? "Skipping" : v.choice ? `Resuming with ${v.label ?? v.choice}` : "Resuming"),
      (v) => api.decide(v.project, v.issue, v.action, v.choice),
    ),
    gate: useRun<Target & { answer: api.GateAnswer; instruction?: string }>(
      (v) => GATE_LABEL[v.answer],
      (v) => api.answerGate(v.project, v.issue, v.answer, v.instruction),
    ),
    stop: useRun<Target & { reason: string }>(() => "Stopping", (v) => api.stopJob(v.project, v.issue, v.reason)),
    approve: useRun<Target & { approver: string; password: string; version: string; comment: string }>(
      (v) => `Releasing ${v.version}`,
      (v) => api.approveRelease(v.project, v.issue, v),
    ),
  };
}

export function usePickup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ project, enabled }: { project: string; enabled: boolean }) => api.setPickup(project, enabled),
    onMutate: async ({ project, enabled }) => {
      await client.cancelQueries({ queryKey: keys.projects });
      const before = client.getQueryData<ProjectRow[]>(keys.projects);
      client.setQueryData<ProjectRow[]>(keys.projects, (rows) => rows?.map((r) => (r.name === project ? { ...r, enabled } : r)));
      return { before };
    },
    onError: (e, { project }, ctx) => {
      if (ctx?.before) client.setQueryData(keys.projects, ctx.before);
      toast.alarm(`${project} — pickup not changed`, said(e));
    },
    onSuccess: (_out, { project, enabled }) => toast.ok(project, enabled ? "Pickup is on — the next card in TO-DO will be taken" : "Pickup is off — no new card will be taken"),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.projects });
      void client.invalidateQueries({ queryKey: ["floor"] });
    },
  });
}

export function useScan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (project: string) => api.scan(project),
    onSuccess: (out, project) => {
      toast.info(project, out?.message || "Asked the queue");
      void client.invalidateQueries({ queryKey: keys.engine });
    },
    onError: (e, project) => toast.alarm(`${project} — could not scan`, said(e)),
  });
}
