// The tech lead's narration — picked up, opened a pull request, merged, deployed — said once each,
// as it happens. What was said before this page opened is history, not news.
import { useEffect, useRef } from "react";
import { useCoordinator } from "../live/useLiveQueries";
import { toast } from "../ui/toast";

export function Narration() {
  const coordinator = useCoordinator();
  const seen = useRef<Set<number> | null>(null);
  useEffect(() => {
    const list = coordinator.data;
    if (!list) return;
    if (!seen.current) {
      seen.current = new Set(list.map((m) => m.id ?? -1));
      return;
    }
    for (const m of list) {
      if (m.id == null || seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      toast.info(m.project ?? "The factory", m.text ?? "");
    }
  }, [coordinator.data]);
  return null;
}
