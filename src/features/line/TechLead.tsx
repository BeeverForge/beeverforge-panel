// The tech lead on call for this line: what it told the floor, what it asks, the one action it
// proposes, and a box to ask it something. Its conversation is pushed over the floor socket.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMessages } from "../../live/useLiveQueries";
import { askTechLead, answerQuestion, approveSuggestion } from "../../api/actions";
import { keys } from "../../api/queries";
import { ago, useNow } from "../../live/clock";
import { Button, Note, Skeleton } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { toast } from "../../ui/toast";
import s from "./line.module.css";

export function TechLead({ project }: { project: string }) {
  const msgs = useMessages(project);
  const client = useQueryClient();
  const now = useNow();
  const [q, setQ] = useState("");
  const refresh = () => void client.invalidateQueries({ queryKey: keys.messages(project) });
  const ask = useMutation({
    mutationFn: (question: string) => askTechLead(project, question),
    onSuccess: () => {
      setQ("");
      refresh();
    },
    onError: (e) => toast.alarm("The tech lead did not take the question", (e as Error).message),
  });
  const answer = useMutation({
    mutationFn: (v: { token: string; answer: string }) => answerQuestion(project, v.token, v.answer),
    onSuccess: (out) => {
      toast.ok("Answered", out.message);
      refresh();
    },
    onError: (e) => toast.alarm("Not answered", (e as Error).message),
  });
  const approve = useMutation({
    mutationFn: (token: string) => approveSuggestion(project, token),
    onSuccess: (out) => {
      toast.ok("Done", out.message);
      refresh();
    },
    onError: (e) => toast.alarm("Not done", (e as Error).message),
  });

  const data = msgs.data;
  const thread = [...(data?.messages ?? [])].slice(-12);
  const pending = data?.pending ?? [];
  const sug = data?.suggestion;

  return (
    <section className={s.panel} aria-labelledby="tl-title">
      <h2 id="tl-title" className={s.panelTitle}>
        Tech lead
      </h2>
      {msgs.isPending ? (
        <div className={s.thread} aria-hidden="true">
          <Skeleton w="80%" h={30} />
          <Skeleton w="60%" h={30} />
        </div>
      ) : msgs.isError && !data ? (
        <Note tone="alarm" icon="alert">
          The tech lead's conversation could not be read. {(msgs.error as Error).message}
        </Note>
      ) : (
        <ol className={s.thread} aria-live="polite">
          {!thread.length && !pending.length && <li className={s.quiet}>Nothing said yet. It speaks up when a card is picked up, opens a pull request, or stops.</li>}
          {thread.map((m, i) => (
            <li key={`${m.ts}${i}`} className={s.msg} data-who={m.kind === "said" ? "you" : m.kind === "answered" ? "you" : "tl"}>
              <span>{m.text}</span>
              <time>{ago(m.ts, now)}</time>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.token} className={s.pending}>
              <span>{p.text}</span>
              <div className={s.askRow}>
                {(p.options ?? []).map((o) => (
                  <Button key={o.key} size="sm" busy={answer.isPending && answer.variables?.answer === o.key} onClick={() => answer.mutate({ token: p.token ?? "", answer: o.key ?? "" })}>
                    {o.key} · {o.label}
                  </Button>
                ))}
              </div>
            </li>
          ))}
          {sug && (
            <li className={s.pending}>
              <span>
                It proposes: <b>{sug.labels?.action ?? sug.action}</b> {sug.labels?.issue ?? (sug.issue ? `#${sug.issue}` : "")}
              </span>
              {sug.live === false ? (
                <span className={s.quiet}>{sug.reason}</span>
              ) : (
                <div className={s.askRow}>
                  <Button size="sm" tier="primary" icon="play" busy={approve.isPending} onClick={() => approve.mutate(sug.token ?? "")}>
                    Do it
                  </Button>
                </div>
              )}
            </li>
          )}
        </ol>
      )}
      <form
        className={s.askBox}
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) ask.mutate(q.trim());
        }}
      >
        <label htmlFor="tl-ask" className="sr-only">
          Ask the tech lead
        </label>
        <input id="tl-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this line…" autoComplete="off" />
        <button type="submit" aria-label="Ask" disabled={!q.trim() || ask.isPending}>
          {ask.isPending ? <span className={s.dotSpin} /> : <Icon name="send" size={14} />}
        </button>
      </form>
    </section>
  );
}
