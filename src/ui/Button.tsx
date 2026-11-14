import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import s from "./ui.module.css";
import { Icon, type IconName } from "./Icon";

type Tier = "primary" | "plain" | "quiet";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tier?: Tier;
  size?: "sm" | "md";
  icon?: IconName;
  busy?: boolean;
  children?: ReactNode;
}

/** Three tiers, never more: primary decides, plain redirects, quiet ends or dismisses. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tier = "plain", size = "md", icon, busy, className, children, disabled, ...rest },
  ref,
) {
  const cls = [
    s.btn,
    tier === "primary" && s.primary,
    tier === "quiet" && s.quiet,
    size === "sm" && s.sm,
    !children && icon && s.icon,
    busy && s.busy,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type="button" className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className={s.spinner} aria-hidden="true" /> : icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  );
});

export type Tone = "run" | "ok" | "alarm" | "clock" | "idle";

export function Dot({ tone = "idle", pulse = false, label }: { tone?: Tone; pulse?: boolean; label?: string }) {
  return (
    <i
      className={s.dot}
      data-tone={tone}
      data-pulse={pulse}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className={s.chip} title={title}>
      {children}
    </span>
  );
}

export function Skeleton({ w = "100%", h = 12, r, style }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return <span className={s.sk} aria-hidden="true" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** A sentence that stands where content would be: unread (`tone="alarm"`) is never drawn as empty. */
export function Note({ children, tone, icon }: { children: ReactNode; tone?: "alarm"; icon?: IconName }) {
  return (
    <div className={s.note} data-tone={tone} role={tone === "alarm" ? "status" : undefined}>
      {icon && <Icon name={icon} size={15} />}
      <div>{children}</div>
    </div>
  );
}

export { s as uiStyles };
