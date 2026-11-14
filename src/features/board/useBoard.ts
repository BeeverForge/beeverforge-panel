// Every write a person makes to a board, each answered by the server's own sentence. A move is
// drawn at once and put back if the server refuses it.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { act } from "../../api/actions";
import { keys } from "../../api/queries";
import type { BoardRead } from "../../api/types";
import { toast } from "../../ui/toast";

const said = (e: unknown) => (e instanceof Error ? e.message : "it did not say why");

export function useBoardWrites(project: string) {
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: ["board", project] });

  const move = useMutation({
    mutationFn: (v: { issue: string; column: string }) => act("card_move", { project, issue: v.issue, column: v.column }),
    onMutate: async ({ issue, column }) => {
      const key = keys.board(project);
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<BoardRead>(key);
      client.setQueryData<BoardRead>(key, (b) =>
        b ? { ...b, cards: b.cards?.map((c) => (c.ref === issue ? { ...c, column } : c)) } : b,
      );
      return { before };
    },
    onError: (e, { issue }, ctx) => {
      if (ctx?.before) client.setQueryData(keys.board(project), ctx.before);
      toast.alarm(`#${issue} stays where it was`, said(e));
    },
    onSuccess: (out, { issue, column }) => {
      if (/to-?do/i.test(column)) toast.ok(`#${issue} is in the queue`, "Pickup takes it in order — the line runs one card at a time.");
      else toast.ok(`#${issue}`, out.message);
    },
    onSettled: refresh,
  });

  const create = useMutationFor("card_create", "Card created", project, refresh);
  const edit = useMutationFor("card_edit", "Card saved", project, refresh);
  const close = useMutationFor("card_close", "Card closed", project, refresh);
  const remove = useMutationFor("card_remove", "Card removed", project, refresh);
  const reopen = useMutationFor("card_reopen", "Card reopened", project, refresh);
  const comment = useMutationFor("card_comment", "Comment posted", project, refresh);
  const mergePr = useMutationFor("pr_merge", "Merged", project, refresh);

  return { move, create, edit, close, remove, reopen, comment, mergePr };
}

function useMutationFor(name: string, done: string, project: string, refresh: () => void) {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => act(name, { project, ...params }),
    onSuccess: (out) => {
      toast.ok(done, out.message);
      refresh();
    },
    onError: (e) => toast.alarm(`${done.replace(/ed$/, "")} — not done`, said(e)),
  });
}

/** What pickup would make of a draft (`card_check`): "" when it would take it, else the gate's sentence. */
export async function checkCard(project: string, title: string, body: string) {
  const out = await act("card_check", { project, title, body });
  const verdict = out.data?.refusal;
  return typeof verdict === "string" ? verdict : "";
}
