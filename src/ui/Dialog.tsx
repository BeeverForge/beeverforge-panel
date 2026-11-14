// A dialog where focus must be protected (a release, a destructive stop, a text to write), and a
// drawer for reading beside the floor. Both escape their container and return focus on close.
import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import s from "./dialog.module.css";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  variant?: "dialog" | "drawer";
  width?: number;
}

export function Dialog({ open, onOpenChange, title, description, children, variant = "dialog", width }: Props) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={s.scrim} />
        <D.Content
          className={variant === "drawer" ? s.drawer : s.dialog}
          style={width ? { width: `min(${width}px, calc(100vw - 24px))` } : undefined}
        >
          <header className={s.head}>
            <D.Title className={s.title}>{title}</D.Title>
            <D.Close className={s.close} aria-label="Close">
              <Icon name="close" size={14} />
            </D.Close>
          </header>
          {description ? <D.Description className={s.desc}>{description}</D.Description> : <D.Description className="sr-only">{typeof title === "string" ? title : "Details"}</D.Description>}
          <div className={s.body}>{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}
