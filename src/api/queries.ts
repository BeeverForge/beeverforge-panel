// Every read the panel makes, as a query: one key per thing the server knows, so a stream frame
// can write the same entry a fetch would have filled. Reads use the versioned `/api/v1/` paths the
// contract says a front end of its own builds on.
import { queryOptions } from "@tanstack/react-query";
import { get, seg } from "./http";
import type {
  BoardRead,
  BudgetRead,
  Cockpit,
  CoordinatorMessage,
  EngineRead,
  FloorRead,
  InboxItem,
  JobDetail,
  JournalEvent,
  JournalJob,
  MessagesRead,
  MetricsRead,
  PreviewRead,
  ProjectRow,
  PromoteRead,
  WhoamiRead,
} from "./types";

export const keys = {
  whoami: ["whoami"] as const,
  projects: ["projects"] as const,
  engine: ["engine"] as const,
  floor: (project = "") => ["floor", project] as const,
  inbox: ["inbox"] as const,
  coordinator: ["coordinator"] as const,
  budget: ["budget"] as const,
  cockpit: (project: string) => ["cockpit", project] as const,
  board: (project: string, card?: string, pr?: string) => ["board", project, card ?? "", pr ?? ""] as const,
  journal: ["journal"] as const,
  jobDetail: (project: string, issue: string) => ["job", project, issue] as const,
  jobEvents: (project: string, issue: string) => ["job-events", project, issue] as const,
  messages: (project: string) => ["messages", project] as const,
  metrics: (project: string) => ["metrics", project] as const,
  promote: (project: string, issue: string) => ["promote", project, issue] as const,
  preview: (project: string, unit: string) => ["preview", project, unit] as const,
};

export const q = {
  whoami: () => queryOptions({ queryKey: keys.whoami, queryFn: ({ signal }) => get<WhoamiRead>("/api/v1/whoami", signal), staleTime: 60_000 }),
  projects: () => queryOptions({ queryKey: keys.projects, queryFn: ({ signal }) => get<ProjectRow[]>("/api/v1/projects", signal) }),
  engine: () => queryOptions({ queryKey: keys.engine, queryFn: ({ signal }) => get<EngineRead>("/api/v1/temporal/jobs", signal) }),
  floor: (project = "") =>
    queryOptions({
      queryKey: keys.floor(project),
      queryFn: ({ signal }) => get<FloorRead>(project ? `/api/v1/floor/${seg(project)}` : "/api/v1/floor", signal),
    }),
  inbox: () => queryOptions({ queryKey: keys.inbox, queryFn: ({ signal }) => get<InboxItem[]>("/api/v1/inbox", signal) }),
  coordinator: () =>
    queryOptions({ queryKey: keys.coordinator, queryFn: ({ signal }) => get<CoordinatorMessage[]>("/api/v1/coordinator/messages", signal) }),
  budget: () => queryOptions({ queryKey: keys.budget, queryFn: ({ signal }) => get<BudgetRead>("/api/v1/budget", signal), staleTime: 60_000 }),
  cockpit: (project: string) =>
    queryOptions({ queryKey: keys.cockpit(project), queryFn: ({ signal }) => get<Cockpit>(`/api/factory/${seg(project)}`, signal), staleTime: 30_000 }),
  board: (project: string, card?: string, pr?: string) =>
    queryOptions({
      queryKey: keys.board(project, card, pr),
      queryFn: ({ signal }) => {
        const search = new URLSearchParams();
        if (card) search.set("card", card);
        if (pr) search.set("pr", pr);
        const tail = search.size ? `?${search}` : "";
        return get<BoardRead>(`/api/v1/board/${seg(project)}${tail}`, signal);
      },
    }),
  journal: () => queryOptions({ queryKey: keys.journal, queryFn: ({ signal }) => get<JournalJob[]>("/api/v1/jobs", signal) }),
  jobDetail: (project: string, issue: string) =>
    queryOptions({
      queryKey: keys.jobDetail(project, issue),
      queryFn: ({ signal }) => get<JobDetail>(`/api/v1/jobs/${seg(project)}/${seg(issue)}/detail`, signal),
    }),
  jobEvents: (project: string, issue: string) =>
    queryOptions({
      queryKey: keys.jobEvents(project, issue),
      queryFn: ({ signal }) => get<JournalEvent[]>(`/api/jobs/${seg(project)}/${seg(issue)}/events`, signal),
    }),
  messages: (project: string) =>
    queryOptions({ queryKey: keys.messages(project), queryFn: ({ signal }) => get<MessagesRead>(`/api/v1/messages/${seg(project)}`, signal) }),
  metrics: (project: string) =>
    queryOptions({
      queryKey: keys.metrics(project),
      queryFn: ({ signal }) => get<MetricsRead>(`/api/v1/metrics${project ? `?project=${seg(project)}` : ""}`, signal),
      staleTime: 30_000,
    }),
  promote: (project: string, issue: string) =>
    queryOptions({ queryKey: keys.promote(project, issue), queryFn: ({ signal }) => get<PromoteRead>(`/api/v1/promote/${seg(project)}/${seg(issue)}`, signal) }),
  preview: (project: string, unit: string) =>
    queryOptions({ queryKey: keys.preview(project, unit), queryFn: ({ signal }) => get<PreviewRead>(`/api/preview/${seg(project)}/${seg(unit)}`, signal) }),
};
