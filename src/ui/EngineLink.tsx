import { Icon } from "./Icon";

/** A way into the engine's own UI. Where nobody said where it is, the control stays and says why
 *  it cannot be followed (the server's sentence), rather than vanishing as if there were none. */
export function EngineLink({ href, hint, className, offClassName }: { href?: string | null; hint?: string | null; className?: string; offClassName?: string }) {
  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer" title="Open this in the engine's own UI">
        <Icon name="external" size={14} /> Engine
      </a>
    );
  }
  const why = hint || "Nobody said where this deployment's engine UI is.";
  return (
    <span className={[className, offClassName].filter(Boolean).join(" ")} aria-disabled="true" title={why}>
      <Icon name="external" size={14} /> Engine
      <span className="sr-only"> — unavailable: {why}</span>
    </span>
  );
}
