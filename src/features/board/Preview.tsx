// A change running before it goes in (ADR-0050): start it, try it, take it down. Read again while
// it starts, and only then.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { q, keys } from "../../api/queries";
import { previewVerb } from "../../api/actions";
import { ago, useNow } from "../../live/clock";
import { Button, Dot } from "../../ui/Button";
import { toast } from "../../ui/toast";
import s from "./board.module.css";

export function Preview({ project, unit, autoOpen }: { project: string; unit: string; autoOpen?: boolean }) {
  const client = useQueryClient();
  const now = useNow();
  const read = useQuery({
    ...q.preview(project, unit),
    refetchInterval: (query) => (query.state.data?.starting || query.state.data?.state === "starting" ? 3000 : false),
  });
  const verb = useMutation({
    mutationFn: (v: "start" | "stop" | "rebuild") => previewVerb(project, unit, v),
    onSuccess: (out) => {
      toast.ok("Preview", out.message);
      void client.invalidateQueries({ queryKey: keys.preview(project, unit) });
    },
    onError: (e) => toast.alarm("Preview — not done", (e as Error).message),
  });
  const p = read.data;
  if (!p) return null;
  const web = p.services?.find((x) => x.url && x.from_change);
  return (
    <section className={s.preview} data-state={p.state} aria-labelledby={`pv-${unit}`}>
      <h3 id={`pv-${unit}`} className={s.h3}>
        Preview
      </h3>
      <p>
        <Dot tone={p.live ? "ok" : p.starting ? "run" : "idle"} pulse={p.starting} /> {p.headline}
      </p>
      {p.why && <p className={s.sub}>{p.why}</p>}
      {!!p.services?.length && (
        <ul className={s.services}>
          {p.services.map((svc) => (
            <li key={svc.name}>
              <Dot tone={svc.health === "healthy" ? "ok" : "alarm"} />
              <b>{svc.name}</b>
              {svc.url ? (
                <a href={svc.url} target="_blank" rel="noreferrer">
                  {svc.url.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className={s.sub}>internal</span>
              )}
              {!svc.from_change && <span className={s.sub}>as it is on the base</span>}
            </li>
          ))}
        </ul>
      )}
      <div className={s.controls}>
        {p.can_start && (
          <Button size="sm" tier={autoOpen ? "primary" : "plain"} busy={verb.isPending && verb.variables === "start"} onClick={() => verb.mutate("start")}>
            {p.state === "ended" ? "Start it again" : "Start a preview"}
          </Button>
        )}
        {p.live && web?.url && (
          <a className={s.open} href={web.url} target="_blank" rel="noreferrer">
            Try it
          </a>
        )}
        {(p.live || p.starting) && (
          <>
            <Button size="sm" busy={verb.isPending && verb.variables === "rebuild"} onClick={() => verb.mutate("rebuild")}>
              Rebuild from the latest change
            </Button>
            <Button size="sm" tier="quiet" busy={verb.isPending && verb.variables === "stop"} onClick={() => verb.mutate("stop")}>
              Take it down
            </Button>
          </>
        )}
        {p.expires_at && p.live && <span className={s.sub}>up until {new Date(p.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · started {ago(p.started_at, now)}</span>}
      </div>
    </section>
  );
}
