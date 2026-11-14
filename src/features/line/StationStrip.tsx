// The line's stations drawn large: the same marks as the cabinet — a tick and its time for what
// passed, the gold card for where the job is, red when it waits on a person, an empty slot ahead.
import { STATIONS, type Position, type Station } from "../../live/pipeline";
import { duration, short, useNow } from "../../live/clock";
import { Icon } from "../../ui/Icon";
import s from "./line.module.css";

export function StationStrip({
  stations,
  position,
  times,
  singleAgent,
}: {
  stations: Station[];
  position: Position | undefined;
  times: Map<number, { from: number; to: number | null }>;
  singleAgent: boolean;
}) {
  const now = useNow();
  return (
    <ol className={s.strip} aria-label="Stations">
      {STATIONS.map((st) => {
        if (st.key === "planning" && singleAgent) return null;
        const idx = stations.findIndex((x) => x.key === st.key);
        const t = times.get(idx);
        const state =
          !position || idx > position.at
            ? "ahead"
            : idx < position.at
              ? "passed"
              : position.mode === "held"
                ? "held"
                : position.mode === "failed"
                  ? "failed"
                  : "here";
        const took = t ? (t.to ?? now) - t.from : null;
        return (
          <li key={st.key} className={s.station} data-state={state} title={st.what} aria-current={state === "here" || state === "held" ? "step" : undefined}>
            <span className={s.mark}>
              {state === "passed" ? <Icon name="check" size={12} strokeWidth={2.2} /> : state === "held" ? <Icon name="pause" size={12} strokeWidth={2.2} /> : null}
            </span>
            <span className={s.stLabel}>{st.label}</span>
            <span className={s.stTime}>{state === "ahead" ? "" : state === "passed" ? duration(took) : short(took)}</span>
          </li>
        );
      })}
    </ol>
  );
}
