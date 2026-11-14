// A new production line: a name and where its code is. The address is read back as it is typed,
// the way the server will read it (`/api/v1/address`), before anything is registered.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { get } from "../../api/http";
import { registerProject } from "../../api/actions";
import { keys } from "../../api/queries";
import { Dialog, DialogActions } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { toast } from "../../ui/toast";
import f from "../answer/answers.module.css";
import s from "./page.module.css";

interface AddressRead {
  kind?: string | null;
  coordinates?: Record<string, unknown> | null;
  refusal?: string | null;
}

export function RegisterProject({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [where, setWhere] = useState("");
  const [read, setRead] = useState<{ for: string; out: AddressRead | null; error: string }>({ for: "", out: null, error: "" });

  useEffect(() => {
    if (!where.trim()) return;
    const id = window.setTimeout(() => {
      const isUrl = /^(https?:\/\/|git@)/.test(where.trim());
      get<AddressRead>(`/api/v1/address?${isUrl ? "repo" : "repo_path"}=${encodeURIComponent(where.trim())}`)
        .then((out) => setRead({ for: where, out, error: "" }))
        .catch((e: Error) => setRead({ for: where, out: null, error: e.message }));
    }, 350);
    return () => window.clearTimeout(id);
  }, [where]);

  const add = useMutation({
    mutationFn: () => {
      const isUrl = /^(https?:\/\/|git@)/.test(where.trim());
      return registerProject({ name: name.trim(), repo_path: isUrl ? "" : where.trim(), ...(isUrl ? { repo: where.trim() } : {}) });
    },
    onSuccess: (out) => {
      toast.ok(`${name} registered`, out.message);
      void client.invalidateQueries({ queryKey: keys.projects });
      onClose();
    },
    onError: (e) => toast.alarm("Not registered", (e as Error).message),
  });

  const current = read.for === where && where.trim() ? read : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="New production line" description="A project the factory picks cards up for: its name, and where its code lives.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && where.trim()) add.mutate();
        }}
      >
        <label className={f.field}>
          <span className={f.label}>Name</span>
          <input className={f.input} value={name} onChange={(e) => setName(e.target.value.replace(/\s+/g, "-").toLowerCase())} placeholder="harbour-ledger" required />
        </label>
        <label className={f.field}>
          <span className={f.label}>Where the code is — a path on this machine, or a repository address</span>
          <input className={f.input} value={where} onChange={(e) => setWhere(e.target.value)} placeholder="/home/me/code/harbour-ledger or https://github.com/acme/ledger" required />
        </label>
        <p className={s.addressRead} role="status" aria-live="polite">
          {!where.trim()
            ? "How the server reads the address appears here."
            : !current
              ? "Reading the address…"
              : current.error
                ? `It could not be read — ${current.error}`
                : current.out?.refusal
                  ? `It would be refused: ${current.out.refusal}`
                  : `Read as ${current.out?.kind ?? "an address"}${current.out?.coordinates ? ` — ${Object.entries(current.out.coordinates).map(([k, v]) => `${k} ${String(v)}`).join(", ")}` : ""}.`}
        </p>
        <DialogActions>
          <Button tier="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button tier="primary" type="submit" busy={add.isPending} disabled={!name.trim() || !where.trim() || Boolean(current?.out?.refusal)}>
            Register it
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
