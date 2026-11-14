// A pull request on a forge this platform holds itself: what it says, its review, and its diff.
import { useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import { ago, useNow } from "../../live/clock";
import { Dialog } from "../../ui/Dialog";
import { Button, Note, Skeleton } from "../../ui/Button";
import { Markdown } from "../../ui/Markdown";
import { useBoardWrites } from "./useBoard";
import s from "./board.module.css";

export function PrDrawer({ project, pr, onClose }: { project: string; pr: string; onClose: () => void }) {
  const read = useQuery(q.board(project, undefined, pr.replace(/^#/, "")));
  const writes = useBoardWrites(project);
  const now = useNow();
  const p = read.data?.pr;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} variant="drawer" title={`Pull request ${p?.ref ?? `#${pr}`}`} width={720}>
      {read.isPending ? (
        <Skeleton w="100%" h={200} />
      ) : !p || p.readable === false ? (
        <Note tone="alarm" icon="alert">
          {p?.refused || "This pull request could not be read."}
        </Note>
      ) : (
        <div className={s.drawerBody}>
          <div className={s.cardMeta}>
            <span className={s.stateChip} data-state={p.state}>
              {p.state}
            </span>
            {p.can_merge_here && (
              <Button size="sm" tier="primary" icon="merge" busy={writes.mergePr.isPending} onClick={() => writes.mergePr.mutate({ pr: pr.replace(/^#/, "") })}>
                Merge
              </Button>
            )}
          </div>
          {p.body && <Markdown>{p.body}</Markdown>}
          {p.events === null ? (
            <Note tone="alarm">Its history could not be read.</Note>
          ) : (
            !!p.events?.length && (
              <ol className={s.thread}>
                {p.events.map((e, i) => (
                  <li key={i}>
                    <div className={s.commentHead}>
                      <b>{e.by}</b> <span>{e.kind}</span> <span>{ago(e.at, now)}</span>
                    </div>
                    {e.said && <p>{e.said}</p>}
                  </li>
                ))}
              </ol>
            )
          )}
          {p.diff ? (
            <pre className={s.diff} aria-label="The change">
              {p.diff.split("\n").map((line, i) => (
                <span key={i} data-line={line.startsWith("+++") || line.startsWith("---") ? "file" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : line.startsWith("@@") ? "hunk" : undefined}>
                  {line}
                  {"\n"}
                </span>
              ))}
            </pre>
          ) : (
            <p className={s.sub}>No diff to show.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
