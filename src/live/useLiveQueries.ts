// The reads that stay fresh by themselves: from a stream when it is up, from a timer only while it
// is down. The default panel polled all of these on fixed timers whatever the streams did.
import { useQuery } from "@tanstack/react-query";
import { q } from "../api/queries";
import { useLive } from "./status";

const whileDown = (link: string, ms: number) => (link === "live" ? false : ms);

export function useEngine() {
  const link = useLive((s) => s.engine);
  return useQuery({ ...q.engine(), refetchInterval: whileDown(link, 20_000) });
}

export function useFloor(project = "") {
  const link = useLive((s) => s.engine);
  return useQuery({ ...q.floor(project), refetchInterval: whileDown(link, 20_000) });
}

export function useInbox() {
  const link = useLive((s) => s.engine);
  return useQuery({ ...q.inbox(), refetchInterval: whileDown(link, 15_000) });
}

export function useProjects() {
  const link = useLive((s) => s.floor);
  return useQuery({ ...q.projects(), refetchInterval: whileDown(link, 30_000) });
}

export function useMessages(project: string) {
  const link = useLive((s) => s.floor);
  return useQuery({ ...q.messages(project), enabled: Boolean(project), refetchInterval: whileDown(link, 15_000) });
}

/** The tech-lead's narration has no stream of its own; engine changes ask for it, and a slow timer
 *  catches the rest. */
export function useCoordinator() {
  return useQuery({ ...q.coordinator(), refetchInterval: 30_000 });
}
