// What the server said about an action, said once and announced to a screen reader. Errors stay
// until dismissed; everything else leaves after a few seconds.
import { create } from "zustand";
import { useEffect } from "react";
import s from "./toast.module.css";
import { Icon } from "./Icon";

export type ToastTone = "ok" | "alarm" | "info";

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  drop: (id: number) => void;
}

let seq = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => set((st) => ({ toasts: [...st.toasts.slice(-3), { ...t, id: seq++ }] })),
  drop: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  ok: (title: string, body?: string) => useToasts.getState().push({ title, body, tone: "ok" }),
  info: (title: string, body?: string) => useToasts.getState().push({ title, body, tone: "info" }),
  alarm: (title: string, body?: string) => useToasts.getState().push({ title, body, tone: "alarm" }),
};

function Item({ t }: { t: Toast }) {
  const drop = useToasts((st) => st.drop);
  useEffect(() => {
    if (t.tone === "alarm") return;
    const id = window.setTimeout(() => drop(t.id), 5200);
    return () => window.clearTimeout(id);
  }, [t, drop]);
  return (
    <li className={s.toast} data-tone={t.tone}>
      <Icon name={t.tone === "alarm" ? "alert" : t.tone === "ok" ? "check" : "clock"} size={15} />
      <div className={s.text}>
        <strong>{t.title}</strong>
        {t.body && <span>{t.body}</span>}
      </div>
      <button type="button" className={s.close} onClick={() => drop(t.id)} aria-label="Dismiss">
        <Icon name="close" size={13} />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useToasts((st) => st.toasts);
  return (
    <section className={s.region} aria-label="Notifications">
      <ol aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <Item key={t.id} t={t} />
        ))}
      </ol>
    </section>
  );
}
