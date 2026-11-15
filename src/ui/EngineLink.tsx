import { Icon } from "./Icon";

interface Props {
  href?: string | null;
  /** The server's sentence for a link nobody could give (`ui_hint`, `engine_ui_hint`). */
  hint?: string | null;
  /** What the link opens, for its tooltip: "this run", "this line". */
  what?: string;
  label?: string;
  /** The arrow alone, named for a screen reader: for a row that has no room for a word. */
  iconOnly?: boolean;
  iconAfter?: boolean;
  size?: number;
  className?: string;
  offClassName?: string;
}

/** A way into the engine's own UI. Where nobody said where it is, the control stays and says why
 *  it cannot be followed (the server's sentence) — an empty address is not "no link", it resolves
 *  to the page you are on. */
export function EngineLink({ href, hint, what = "this", label = "Engine", iconOnly = false, iconAfter = false, size = 14, className, offClassName }: Props) {
  const icon = <Icon name="external" size={size} />;
  const body = iconOnly ? icon : iconAfter ? <>{label} {icon}</> : <>{icon} {label}</>;
  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer" title={`Open ${what} in the engine's own UI`} aria-label={iconOnly ? `Open ${what} in the engine` : undefined}>
        {body}
      </a>
    );
  }
  const why = hint || "Nobody said where this deployment's engine UI is.";
  return (
    <span className={[className, offClassName].filter(Boolean).join(" ")} aria-disabled="true" title={why} role={iconOnly ? "img" : undefined} aria-label={iconOnly ? `Engine link unavailable: ${why}` : undefined}>
      {body}
      {!iconOnly && <span className="sr-only"> — unavailable: {why}</span>}
    </span>
  );
}
