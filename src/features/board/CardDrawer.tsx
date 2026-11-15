// One card, opened beside its board: what it asks for, its thread, its preview, and what a person
// may still do to it. The words on the controls are the server's (`catalog.card_view`).
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import { ago, useNow } from "../../live/clock";
import { Dialog, DialogActions } from "../../ui/Dialog";
import { Button, Note, Skeleton } from "../../ui/Button";
import { Markdown } from "../../ui/Markdown";
import { EngineLink } from "../../ui/EngineLink";
import { useEngine } from "../../live/useLiveQueries";
import { useBoardWrites } from "./useBoard";
import { CardForm } from "./CardForm";
import { Preview } from "./Preview";
import s from "./board.module.css";
import f from "../answer/answers.module.css";

export function CardDrawer({ project, cardRef, preview, onClose }: { project: string; cardRef: string; preview: boolean; onClose: () => void }) {
  const ref = cardRef.replace(/^#/, "");
  const read = useQuery(q.board(project, `#${ref}`));
  const engine = useEngine();
  // The engine lists a card's newest run first; that run's workflow is what the card's link opens.
  const run = (engine.data?.jobs ?? []).find((j) => j.project === project && j.issue === ref);
  const writes = useBoardWrites(project);
  const now = useNow();
  const [reasonFor, setReasonFor] = useState<null | "close" | "remove">(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const c = read.data?.card;
  const words = c?.words ?? {};

  if (editing && c) return <CardForm project={project} editing={{ ref, title: c.title ?? "", body: c.body ?? "" }} onClose={() => setEditing(false)} />;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} variant="drawer" title={c?.title ? `#${ref} — ${c.title}` : `#${ref}`}>
      {read.isPending ? (
        <div className={s.drawerBody}>
          <Skeleton w="40%" h={14} />
          <Skeleton w="100%" h={120} />
        </div>
      ) : !c || c.readable === false ? (
        <Note tone="alarm" icon="alert">
          This card could not be read. {read.error instanceof Error ? read.error.message : ""}
        </Note>
      ) : (
        <div className={s.drawerBody}>
          <div className={s.cardMeta}>
            <span className={s.stateChip} data-state={c.state}>
              {c.state === "open" ? "open" : c.state ?? "?"}
            </span>
            {c.opened_by_product && <span className={s.sub}>opened by the product role from {c.opened_by_product}</span>}
            {c.started && (
              <Link to="/p/$project" params={{ project }} className={s.heldBy}>
                {c.finished ? "Finished by the factory" : "A job holds this card — see it on its line"}
              </Link>
            )}
            {c.started && <EngineLink href={run?.temporal_url} hint={engine.data?.ui_hint} what={`run #${ref}`} label="Engine" iconAfter size={12} className={s.engineChip} offClassName={s.engineOff} />}
          </div>

          {c.body ? <Markdown>{c.body}</Markdown> : <p className={s.sub}>This card has no description.</p>}

          <div className={s.controls}>
            {c.open !== false && !c.started && (
              <Button size="sm" icon="edit" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {c.open !== false ? (
              <>
                <Button size="sm" tier="quiet" onClick={() => setReasonFor("close")}>
                  {words.close ?? "Close card"}
                </Button>
                {c.removes && (
                  <Button size="sm" tier="quiet" onClick={() => setReasonFor("remove")}>
                    {words.remove ?? "Remove from the board"}
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" busy={writes.reopen.isPending} onClick={() => writes.reopen.mutate({ issue: ref })}>
                Reopen
              </Button>
            )}
          </div>
          {words.note && <p className={s.sub}>{words.note}</p>}

          <Preview project={project} unit={ref} autoOpen={preview} />

          <section>
            <h3 className={s.h3}>Thread</h3>
            {c.comments === null || c.comments === undefined ? (
              <Note tone="alarm">The thread could not be read — this is not the same as no comments.</Note>
            ) : c.comments.length === 0 ? (
              <p className={s.sub}>No comments yet.</p>
            ) : (
              <ol className={s.thread}>
                {c.comments.map((m, i) => (
                  <li key={i}>
                    <div className={s.commentHead}>
                      <b>{m.author || "a person on the board"}</b>
                      <span>{ago(m.created_at, now)}</span>
                    </div>
                    <Markdown>{m.body ?? ""}</Markdown>
                  </li>
                ))}
              </ol>
            )}
            <form
              className={s.commentBox}
              onSubmit={(e) => {
                e.preventDefault();
                if (!comment.trim()) return;
                writes.comment.mutate({ issue: ref, message: comment.trim() }, { onSuccess: () => setComment("") });
              }}
            >
              <label htmlFor="comment" className="sr-only">
                Comment on #{ref}
              </label>
              <textarea id="comment" className={f.textarea} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Say it on the card — a job that resumes reads its comments." />
              <Button type="submit" size="sm" disabled={!comment.trim()} busy={writes.comment.isPending}>
                Post comment
              </Button>
            </form>
          </section>
        </div>
      )}

      {reasonFor && (
        <Dialog open onOpenChange={(o) => !o && setReasonFor(null)} title={reasonFor === "close" ? (words.close ?? "Close card") : (words.remove ?? "Remove from the board")} description={reasonFor === "close" ? words.ask_close : words.ask_remove}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim()) return;
              const m = reasonFor === "close" ? writes.close : writes.remove;
              m.mutate({ issue: ref, reason: reason.trim() }, { onSuccess: () => (setReasonFor(null), setReason(""), reasonFor === "remove" && onClose()) });
            }}
          >
            <label className={f.label} htmlFor="reason">
              {words.reason ?? "Why? (one line)"}
            </label>
            <input id="reason" className={f.input} value={reason} onChange={(e) => setReason(e.target.value)} />
            <DialogActions>
              <Button tier="quiet" onClick={() => setReasonFor(null)}>
                {words.cancel ?? "Cancel"}
              </Button>
              <Button tier="primary" type="submit" disabled={!reason.trim()}>
                {words.confirm ?? "Confirm"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </Dialog>
  );
}
