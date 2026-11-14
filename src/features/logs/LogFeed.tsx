// One rendering of a run's log, live or finished, so the log of a finished run is the log the
// operator watched while it ran. Long logs are virtualised; the view follows new lines until the
// reader scrolls up, and says so.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { JournalEvent } from "../../api/types";
import s from "./log.module.css";

const LABEL: Record<string, string> = {
  state: "Station",
  agent_action: "Agent",
  validation: "Gate",
  review: "Review",
  pr: "PR",
  note: "Note",
  warning: "Warning",
  error: "Error",
};

const time = (ts?: string) => (ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "");

export function Line({ e, find }: { e: JournalEvent; find?: string }) {
  const label = e.kind === "agent_action" && e.data?.role ? String(e.data.role).replace(/^./, (c) => c.toUpperCase()) : (LABEL[e.kind ?? ""] ?? e.kind ?? "");
  const msg = e.message ?? "";
  const body =
    e.kind === "state" ? (
      <b>{msg.replaceAll("_", " ")}</b>
    ) : e.kind === "pr" && e.data?.url ? (
      <a href={e.data.url}>{msg}</a>
    ) : (
      highlight(msg, find)
    );
  return (
    <div className={s.line} data-kind={e.kind}>
      <time className={s.time}>{time(e.ts)}</time>
      <span className={s.kind}>{label}</span>
      <span className={s.msg}>
        {body}
        {typeof e.data?.cost_usd === "number" && <span className={s.cost}> ${e.data.cost_usd.toFixed(2)}</span>}
        {e.kind === "review" && e.data?.detail?.length ? (
          <ul className={s.findings}>
            {e.data.detail.map((f, i) => (
              <li key={i} data-sev={f.severity}>
                <b>{f.severity}</b> {f.description}
                {f.file && <code> {f.file}{f.line ? `:${f.line}` : ""}</code>}
              </li>
            ))}
          </ul>
        ) : null}
      </span>
    </div>
  );
}

function highlight(text: string, find?: string) {
  if (!find) return text;
  const i = text.toLowerCase().indexOf(find.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + find.length)}</mark>
      {text.slice(i + find.length)}
    </>
  );
}

interface Props {
  events: JournalEvent[];
  /** Follow new lines (a live run). */
  follow?: boolean;
  find?: string;
  height?: number | string;
  empty?: React.ReactNode;
  label: string;
}

export function LogFeed({ events, follow = false, find, height = 360, empty, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const shown = find ? events.filter((e) => (e.message ?? "").toLowerCase().includes(find.toLowerCase())) : events;
  // TanStack Virtual returns functions the React Compiler cannot memoise; this component opts out.
  // eslint-disable-next-line react-hooks/incompatible-library
  const v = useVirtualizer({
    count: shown.length,
    getScrollElement: () => box.current,
    estimateSize: () => 24,
    overscan: 12,
  });

  useLayoutEffect(() => {
    if (follow && pinned && shown.length) v.scrollToIndex(shown.length - 1, { align: "end" });
  }, [follow, pinned, shown.length, v]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!shown.length) return <div className={s.empty}>{empty ?? (find ? "No line matches." : "No lines yet.")}</div>;

  return (
    <div className={s.wrap}>
      <div ref={box} className={s.feed} style={{ height }} role="log" aria-label={label} aria-live={follow ? "polite" : undefined} tabIndex={0}>
        <div style={{ height: v.getTotalSize(), position: "relative" }}>
          {v.getVirtualItems().map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={v.measureElement}
              style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${item.start}px)` }}
            >
              <Line e={shown[item.index]!} find={find} />
            </div>
          ))}
        </div>
      </div>
      {follow && !pinned && (
        <button type="button" className={s.jump} onClick={() => { setPinned(true); v.scrollToIndex(shown.length - 1, { align: "end" }); }}>
          Jump to the newest line
        </button>
      )}
    </div>
  );
}
