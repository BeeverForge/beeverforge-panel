import { short } from "../../live/clock";
import type { Waited } from "./waiting";

const SOURCE = {
  server: "since the engine parked it",
  journal: "since the run entered this state, read from its log",
  none: "the engine gave no time for this wait, and the run's log has none yet",
} as const;

/** How long an ask has waited — or, plainly, that nobody said. */
export function WaitedFor({ waited, now, className, prefix = "" }: { waited: Waited; now: number; className?: string; prefix?: string }) {
  return (
    <span className={className} title={SOURCE[waited.from]}>
      {waited.at ? `${prefix}waiting ${short(Math.max(0, now - waited.at))}` : `${prefix}wait not timed`}
    </span>
  );
}
