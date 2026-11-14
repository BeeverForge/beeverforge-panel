// A new card, or an edit of one nobody has started: written in the sections pickup reads, with the
// pickup gate's own verdict on the draft as it is written (`card_check`).
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogActions } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { checkCard, useBoardWrites } from "./useBoard";
import s from "./board.module.css";
import f from "../answer/answers.module.css";

interface Draft {
  objective: string;
  context: string;
  criteria: string[];
  inScope: string;
  outScope: string;
}

const EMPTY: Draft = { objective: "", context: "", criteria: [""], inScope: "", outScope: "" };

export function compose(d: Draft) {
  const parts: string[] = [];
  if (d.objective.trim()) parts.push(`## Objective\n${d.objective.trim()}`);
  if (d.context.trim()) parts.push(`## Context\n${d.context.trim()}`);
  const crit = d.criteria.map((c) => c.trim()).filter(Boolean);
  if (crit.length) parts.push(`## Acceptance criteria\n${crit.map((c) => `- ${c}`).join("\n")}`);
  if (d.inScope.trim()) parts.push(`## In scope\n${d.inScope.trim()}`);
  if (d.outScope.trim()) parts.push(`## Out of scope\n${d.outScope.trim()}`);
  return parts.join("\n\n");
}

/** A card body written in these sections reads back into them; anything else is edited as text. */
function parse(body: string): Draft | null {
  const sections = body.split(/^## /m).filter(Boolean);
  const d: Draft = { ...EMPTY, criteria: [] };
  for (const sec of sections) {
    const [head, ...rest] = sec.split("\n");
    const text = rest.join("\n").trim();
    const h = (head ?? "").trim().toLowerCase();
    if (h === "objective") d.objective = text;
    else if (h === "context") d.context = text;
    else if (h === "acceptance criteria") d.criteria = text.split("\n").map((l) => l.replace(/^\s*[-*]\s*(\[ \]\s*)?/, "")).filter(Boolean);
    else if (h === "in scope") d.inScope = text;
    else if (h === "out of scope") d.outScope = text;
    else return null;
  }
  if (!d.criteria.length) d.criteria = [""];
  return d;
}

export function CardForm({ project, editing, onClose }: { project: string; editing?: { ref: string; title: string; body: string }; onClose: () => void }) {
  const writes = useBoardWrites(project);
  const parsed = useMemo(() => (editing ? parse(editing.body) : EMPTY), [editing]);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [raw, setRaw] = useState(parsed === null);
  const [draft, setDraft] = useState<Draft>(parsed ?? EMPTY);
  const [text, setText] = useState(editing?.body ?? "");
  const [column, setColumn] = useState<"Backlog" | "TO-DO">("Backlog");
  const [gate, setGate] = useState<{ state: "idle" | "checking" | "ok" | "refused" | "unread"; said: string }>({ state: "idle", said: "" });

  const body = raw ? text : compose(draft);

  useEffect(() => {
    if (!title.trim() && !body.trim()) {
      setGate({ state: "idle", said: "" });
      return;
    }
    setGate((g) => ({ ...g, state: "checking" }));
    const id = window.setTimeout(() => {
      checkCard(project, title, body)
        .then((said) => setGate({ state: said ? "refused" : "ok", said }))
        .catch((e: Error) => setGate({ state: "unread", said: e.message }));
    }, 350);
    return () => window.clearTimeout(id);
  }, [project, title, body]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editing) writes.edit.mutate({ issue: editing.ref, title: title.trim(), body }, { onSuccess: onClose });
    else writes.create.mutate({ title: title.trim(), body, column }, { onSuccess: onClose });
  };

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} variant="drawer" title={editing ? `Edit #${editing.ref}` : "New card"}>
      <form className={s.form} onSubmit={save}>
        <label className={f.field}>
          <span className={f.label}>Title</span>
          <input className={f.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Export the week's reconciled lines" autoFocus required />
        </label>

        <div className={s.modeRow}>
          <span className={f.label}>Description</span>
          <button type="button" className={s.link} onClick={() => (raw ? (setDraft(parse(text) ?? EMPTY), setRaw(false)) : (setText(compose(draft)), setRaw(true)))}>
            {raw ? "Write it in sections" : "Write it as markdown"}
          </button>
        </div>

        {raw ? (
          <textarea className={f.textarea} rows={14} value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <>
            <label className={f.field}>
              <span className={f.label}>Objective — what should be true afterwards</span>
              <textarea className={f.textarea} rows={2} value={draft.objective} onChange={(e) => set("objective", e.target.value)} />
            </label>
            <label className={f.field}>
              <span className={f.label}>Context (optional)</span>
              <textarea className={f.textarea} rows={2} value={draft.context} onChange={(e) => set("context", e.target.value)} />
            </label>
            <fieldset className={s.criteria}>
              <legend className={f.label}>Acceptance criteria — how anyone would know it is done</legend>
              {draft.criteria.map((c, i) => (
                <div key={i} className={s.criterion}>
                  <input
                    className={f.input}
                    value={c}
                    aria-label={`Criterion ${i + 1}`}
                    onChange={(e) => setDraft((d) => ({ ...d, criteria: d.criteria.map((x, j) => (j === i ? e.target.value : x)) }))}
                    placeholder={i === 0 ? "a CSV with one row per reconciled line" : ""}
                  />
                  {draft.criteria.length > 1 && (
                    <button type="button" className={s.remove} aria-label={`Remove criterion ${i + 1}`} onClick={() => setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, j) => j !== i) }))}>
                      <Icon name="close" size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={s.link} onClick={() => setDraft((d) => ({ ...d, criteria: [...d.criteria, ""] }))}>
                Add a criterion
              </button>
            </fieldset>
            <div className={f.pair}>
              <label className={f.field}>
                <span className={f.label}>In scope</span>
                <textarea className={f.textarea} rows={2} value={draft.inScope} onChange={(e) => set("inScope", e.target.value)} />
              </label>
              <label className={f.field}>
                <span className={f.label}>Out of scope</span>
                <textarea className={f.textarea} rows={2} value={draft.outScope} onChange={(e) => set("outScope", e.target.value)} />
              </label>
            </div>
          </>
        )}

        <div className={s.gate} data-state={gate.state} role="status" aria-live="polite">
          {gate.state === "idle" && "Pickup's verdict on this card appears here as you write."}
          {gate.state === "checking" && "Asking pickup what it would make of this card…"}
          {gate.state === "ok" && (
            <>
              <Icon name="check" size={14} /> Pickup would take this card.
            </>
          )}
          {gate.state === "refused" && (
            <>
              <Icon name="alert" size={14} /> Pickup would refuse it: {gate.said}. It can still be saved in Backlog.
            </>
          )}
          {gate.state === "unread" && `Pickup could not be asked — ${gate.said}`}
        </div>

        {!editing && (
          <fieldset className={s.where}>
            <legend className={f.label}>Put it in</legend>
            {(["Backlog", "TO-DO"] as const).map((c) => (
              <label key={c} className={f.seg} data-on={column === c}>
                <input type="radio" name="column" checked={column === c} onChange={() => setColumn(c)} />
                <span>{c === "Backlog" ? "not queued yet" : "the queue — pickup takes it"}</span>
                <b>{c}</b>
              </label>
            ))}
          </fieldset>
        )}

        <DialogActions>
          <Button tier="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button tier="primary" type="submit" disabled={!title.trim()} busy={writes.create.isPending || writes.edit.isPending}>
            {editing ? "Save" : column === "TO-DO" ? "Create and queue" : "Create card"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
