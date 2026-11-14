// The answers to one thing that needs a person, drawn the same wherever it is asked: on the card's
// red plate, in the Needs you column, on the line page. Which answers exist is the server's to say
// (the inbox item's `options`, the job's own flags); this only draws them.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EngineJob, InboxItem, InboxOption } from "../../api/types";
import { q } from "../../api/queries";
import type { GateAnswer } from "../../api/actions";
import { Button } from "../../ui/Button";
import { Dialog, DialogActions } from "../../ui/Dialog";
import { jobKey, usePending } from "./pending";
import { useAnswer } from "./useAnswer";
import s from "./answers.module.css";

export type NeedKind = "decision" | "merge" | "approval" | "rate_limit" | "wedged" | "impediment";

export function kindOf(need: InboxItem | undefined, job: EngineJob | undefined): NeedKind | null {
  if (need?.kind) return need.kind as NeedKind;
  if (!job || job.status !== "running") return null;
  if (job.action?.decision) return "decision";
  if (job.state === "awaiting_your_merge") return "merge";
  if (job.state === "awaiting_prod_approval") return "approval";
  if (job.action?.kind === "rate_limit") return "rate_limit";
  if (job.wedged) return "wedged";
  if (job.attention) return "impediment";
  return null;
}

/** The question, in one sentence, for whichever kind of ask this is. */
export function questionOf(kind: NeedKind, need: InboxItem | undefined, job: EngineJob | undefined): string {
  const note = need?.note || job?.action?.note || "";
  switch (kind) {
    case "decision":
      return need?.decision?.question || job?.action?.decision?.question || "A decision is waiting for your answer.";
    case "merge":
      return `The pull request waits for your review${note ? ` — ${note}` : ""}.`;
    case "approval":
      return note || "A production release waits for your approval.";
    case "rate_limit":
      return `Paused on a usage limit${note ? ` — ${note}` : ""}. It retries by itself.`;
    case "wedged":
      return "Running for hours with no gate and no park — only Stop frees the floor.";
    default:
      return note || "It stopped and will not restart by itself.";
  }
}

export const KICKER: Record<NeedKind, string> = {
  decision: "Decision",
  merge: "Pull request",
  approval: "Release",
  rate_limit: "Paused",
  wedged: "Stuck",
  impediment: "On hold",
};

/** A button that asks once more before it ends something — inline, never a modal. */
function ConfirmInline({ label, confirm, onConfirm, disabled }: { label: string; confirm: string; onConfirm: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <Button
      tier={armed ? "plain" : "quiet"}
      size="sm"
      disabled={disabled}
      className={armed ? s.armed : undefined}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      aria-live="polite"
    >
      {armed ? confirm : label}
    </Button>
  );
}

interface Props {
  project: string;
  issue: string;
  kind: NeedKind;
  need?: InboxItem;
  job?: EngineJob;
  /** On the red plate the buttons are drawn for a red ground. */
  onPlate?: boolean;
}

export function Answers({ project, issue, kind, need, job, onPlate }: Props) {
  const pending = usePending((st) => st.byJob[jobKey(project, issue)]);
  const a = useAnswer();
  const [dialog, setDialog] = useState<null | "adjust" | "approve" | "stop">(null);
  const t = { project, issue };
  const busy = Boolean(pending);

  if (pending) {
    return (
      <div className={s.row} data-plate={onPlate}>
        <span className={s.sending} role="status">
          <span className={s.spinner} aria-hidden="true" />
          {pending.label}…
        </span>
      </div>
    );
  }

  let body: React.ReactNode = null;
  switch (kind) {
    case "decision": {
      const opts = need?.decision?.options ?? job?.action?.decision?.options ?? [];
      const rec = need?.decision?.default ?? job?.action?.decision?.default;
      body = (
        <>
          {opts.map((o) => {
            const recommended = o.recommended || o.key === rec;
            return (
              <Button
                key={o.key}
                size="sm"
                tier={recommended ? "primary" : "plain"}
                title={o.consequence}
                disabled={busy}
                onClick={() => a.decide.mutate({ ...t, action: "resume", choice: o.key, label: `${o.key} · ${o.label}` })}
              >
                {o.key} · {o.label}
                {recommended && <span className="sr-only"> (recommended)</span>}
              </Button>
            );
          })}
          <ConfirmInline label="Skip" confirm="Skip — free the floor" onConfirm={() => a.decide.mutate({ ...t, action: "skip" })} />
        </>
      );
      break;
    }
    case "merge": {
      const act = job?.action;
      const fallback: InboxOption[] = [
        { key: "merge", label: "Merge" },
        ...(act?.can_review ? [{ key: "review", label: "Re-review" }] : []),
        ...(act?.adjusts_left === 0 ? [] : [{ key: "adjust", label: "Adjust" }]),
        ...(act?.can_address && act?.adjusts_left !== 0 ? [{ key: "address", label: "Address comments" }] : []),
        { key: "discard", label: "Discard" },
      ];
      const opts = need?.options?.length ? need.options : fallback;
      body = opts.map((o) => {
        const key = o.key as GateAnswer;
        if (key === "discard")
          return <ConfirmInline key={key} label="Discard" confirm="Close the PR unmerged" onConfirm={() => a.gate.mutate({ ...t, answer: "discard" })} />;
        if (key === "adjust")
          return (
            <Button key={key} size="sm" title={o.consequence} onClick={() => setDialog("adjust")}>
              Adjust…
            </Button>
          );
        return (
          <Button key={key} size="sm" tier={key === "merge" ? "primary" : "plain"} title={o.consequence} onClick={() => a.gate.mutate({ ...t, answer: key })}>
            {o.label ?? key}
          </Button>
        );
      });
      break;
    }
    case "approval":
      body = (
        <Button size="sm" tier="primary" onClick={() => setDialog("approve")}>
          Review and release…
        </Button>
      );
      break;
    case "rate_limit":
      body = (
        <>
          <Button size="sm" tier="primary" onClick={() => a.decide.mutate({ ...t, action: "resume" })}>
            Retry now
          </Button>
          <ConfirmInline label="Skip" confirm="Skip — free the floor" onConfirm={() => a.decide.mutate({ ...t, action: "skip" })} />
        </>
      );
      break;
    case "wedged":
      body = (
        <Button size="sm" tier="primary" onClick={() => setDialog("stop")}>
          Stop…
        </Button>
      );
      break;
    default:
      body = (
        <>
          <Button size="sm" tier="primary" title="re-run the card from the top — fix the card first if it said why" onClick={() => a.decide.mutate({ ...t, action: "resume" })}>
            Retry from the top
          </Button>
          <ConfirmInline label="Skip" confirm="Skip — free the floor" onConfirm={() => a.decide.mutate({ ...t, action: "skip" })} />
        </>
      );
  }

  return (
    <>
      <div className={s.row} data-plate={onPlate}>
        {body}
      </div>
      {dialog === "adjust" && <AdjustDialog {...t} left={job?.action?.adjusts_left} onClose={() => setDialog(null)} />}
      {dialog === "approve" && <ApproveDialog {...t} title={need?.title ?? job?.title ?? ""} onClose={() => setDialog(null)} />}
      {dialog === "stop" && <StopDialog {...t} onClose={() => setDialog(null)} />}
    </>
  );
}

function AdjustDialog({ project, issue, left, onClose }: { project: string; issue: string; left?: number; onClose: () => void }) {
  const a = useAnswer();
  const [text, setText] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Send #${issue} back for one more pass`}
      description={`One more agent pass on the same branch and pull request, against your own words.${left != null ? ` ${left} pass${left === 1 ? "" : "es"} left.` : ""}`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          a.gate.mutate({ project, issue, answer: "adjust", instruction: text.trim() });
          onClose();
        }}
      >
        <label className={s.label} htmlFor="adjust-text">
          What should change
        </label>
        <textarea
          id="adjust-text"
          className={s.textarea}
          rows={5}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="The empty week should still download a file with the header row."
         
        />
        <div className={s.count}>{text.length} / 2000</div>
        <DialogActions>
          <Button tier="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button tier="primary" type="submit" disabled={!text.trim()}>
            Send back
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function StopDialog({ project, issue, onClose }: { project: string; issue: string; onClose: () => void }) {
  const a = useAnswer();
  const [why, setWhy] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Stop #${issue}?`}
      description="This ends the job and frees the floor. It does not resume: the card stays on the board and a fresh job starts from the beginning, so whatever this run had in flight is lost."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          a.stop.mutate({ project, issue, reason: why.trim() });
          onClose();
        }}
      >
        <label className={s.label} htmlFor="stop-why">
          Why (written on the card, optional)
        </label>
        <input id="stop-why" className={s.input} value={why} onChange={(e) => setWhy(e.target.value)} />
        <DialogActions>
          <Button tier="quiet" onClick={onClose}>
            Keep it running
          </Button>
          <Button tier="primary" type="submit">
            Stop the job
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ApproveDialog({ project, issue, title, onClose }: { project: string; issue: string; title: string; onClose: () => void }) {
  const a = useAnswer();
  const info = useQuery(q.promote(project, issue));
  const [approver, setApprover] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setVersion] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const bumps = info.data?.suggestions ?? {};
  // The patch bump is the suggestion until the person picks or types another.
  const version = picked ?? bumps.patch ?? "";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Release #${issue} to production`} description={title} width={480}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          a.approve.mutate({ project, issue, approver, password, version, comment });
          onClose();
        }}
      >
        <p className={s.hint}>
          {info.isPending ? "Reading the latest release…" : info.data?.latest_tag ? `In production now: ${info.data.latest_tag}` : "No release has been tagged yet."}
        </p>
        <fieldset className={s.bumps}>
          <legend className={s.label}>Version</legend>
          <div className={s.segs}>
            {(["patch", "minor", "major"] as const).map((k) =>
              bumps[k] ? (
                <label key={k} className={s.seg} data-on={version === bumps[k]}>
                  <input type="radio" name="bump" value={bumps[k]!} checked={version === bumps[k]} onChange={() => setVersion(bumps[k]!)} />
                  <span>{k}</span>
                  <b>{bumps[k]}</b>
                </label>
              ) : null,
            )}
          </div>
          <input aria-label="Version to release" className={s.input} value={version} onChange={(e) => setVersion(e.target.value)} />
        </fieldset>
        <div className={s.pair}>
          <label className={s.field}>
            <span className={s.label}>Approver login</span>
            <input className={s.input} autoComplete="username" value={approver} onChange={(e) => setApprover(e.target.value)} required />
          </label>
          <label className={s.field}>
            <span className={s.label}>Password</span>
            <input className={s.input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        </div>
        <label className={s.field}>
          <span className={s.label}>Comment (optional)</span>
          <input className={s.input} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <DialogActions>
          <Button tier="quiet" onClick={onClose}>
            Not now
          </Button>
          <Button tier="primary" type="submit" disabled={!approver || !password || !version}>
            Release {version}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
