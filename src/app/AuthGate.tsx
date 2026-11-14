// A deployment with a credential asks for it once, in a real form — never a browser prompt — and a
// deployment with a login page sends the browser there.
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onAuth, setToken } from "../api/http";
import { Dialog, DialogActions } from "../ui/Dialog";
import { Button } from "../ui/Button";
import s from "../features/answer/answers.module.css";

export function AuthGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const off = onAuth((e) => {
      if (e.kind === "login") {
        location.assign(`${e.url}?next=${encodeURIComponent(location.pathname + location.search)}`);
      } else if (e.kind === "needs-token") {
        setAsking(true);
      } else {
        void client.invalidateQueries({ queryKey: ["whoami"] });
      }
    });
    return () => {
      off();
    };
  }, [client]);

  return (
    <>
      {children}
      <Dialog open={asking} onOpenChange={setAsking} title="This deployment asks for a credential" description="Paste the panel token its owner gave you. It is kept in this browser only.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            setToken(value.trim());
            setAsking(false);
            setValue("");
            void client.invalidateQueries();
          }}
        >
          <label className={s.label} htmlFor="token">
            Panel token
          </label>
          <input id="token" className={s.input} type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          <DialogActions>
            <Button tier="primary" type="submit" disabled={!value.trim()}>
              Sign in
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
