// The frame every page shares: the brand, whether this page is live, where to go, and — on the
// floor's pages — the factory's one-sentence verdict, said by the server and never computed here.
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useLive, STALE_AFTER_MS } from "../live/status";
import { useEngine, useFloor } from "../live/useLiveQueries";
import { ago, useNow } from "../live/clock";
import { Chip, Dot, Skeleton } from "../ui/Button";
import { Icon, Mark } from "../ui/Icon";
import { Toaster } from "../ui/toast";
import { usePickup } from "../features/answer/useAnswer";
import { CommandPalette } from "./CommandPalette";
import type { FloorRead } from "../api/types";
import s from "./shell.module.css";

const BRAND = import.meta.env.VITE_BRAND || "BeeverForge";

function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));
  useEffect(() => {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      if (theme === "light") localStorage.setItem("bf_theme", "light");
      else localStorage.removeItem("bf_theme");
    } catch {
      /* private mode: the choice lasts this visit */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))] as const;
}

function LiveState() {
  const engine = useLive((st) => st.engine);
  const floor = useLive((st) => st.floor);
  const word =
    engine === "live" ? "live" : engine === "ended" ? "signed out" : engine === "offline" ? "offline — reading every 20s" : engine === "connecting" ? "connecting" : "reconnecting";
  const tone = engine === "live" ? "ok" : engine === "connecting" ? "idle" : "alarm";
  return (
    <span className={s.live} data-tone={tone} title={`Jobs stream: ${engine} · project stream: ${floor}`} role="status">
      <Dot tone={tone === "ok" ? "ok" : tone === "alarm" ? "alarm" : "idle"} pulse={engine === "live"} />
      {word}
    </span>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: Parameters<typeof Icon>[0]["name"]; children: ReactNode }) {
  return (
    <Link to={to} className={s.nav} activeProps={{ "aria-current": "page" }} activeOptions={{ exact: false }}>
      <Icon name={icon} size={15} />
      <span>{children}</span>
    </Link>
  );
}

export function Shell() {
  const [theme, toggleTheme] = useTheme();
  const [palette, setPalette] = useState(false);
  const path = useRouterState({ select: (st) => st.location.pathname });
  // The line page states its own line's verdict in its header; the bar is the whole floor's.
  const onFloor = path === "/";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={s.app}>
      <a href="#main" className={s.skip}>
        Skip to the floor
      </a>
      <header className={s.top}>
        <Link to="/" className={s.brand} aria-label={`${BRAND} — the floor`}>
          <Mark size={28} />
          <span>{BRAND}</span>
        </Link>
        <LiveState />
        <span className={s.spacer} />
        <nav className={s.navs} aria-label="Main">
          <NavLink to="/board" icon="board">
            Board
          </NavLink>
          <NavLink to="/logs" icon="logs">
            Logs
          </NavLink>
          <NavLink to="/costs" icon="costs">
            Costs
          </NavLink>
          <NavLink to="/product" icon="product">
            Product
          </NavLink>
        </nav>
        <button type="button" className={s.iconBtn} onClick={toggleTheme} aria-label={theme === "light" ? "Switch to the dark theme" : "Switch to the light theme"} title="Theme">
          <Icon name="theme" size={15} />
        </button>
        <button type="button" className={s.search} onClick={() => setPalette(true)} aria-label="Find a card, a project or an action">
          <Icon name="search" size={14} />
          <span>Find a card or project</span>
          <kbd>{navigator.platform.includes("Mac") ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </header>
      {onFloor && <FloorBar project="" />}
      <BuildSplit />
      <main id="main" className={s.main}>
        <Outlet />
      </main>
      <CommandPalette open={palette} onOpenChange={setPalette} />
      <Toaster />
    </div>
  );
}

function BuildSplit() {
  const engine = useEngine();
  const build = engine.data?.build;
  if (build?.agree !== false) return null;
  const other = Object.entries(build.others ?? {})[0];
  return (
    <div className={s.split} role="alert">
      <Icon name="alert" size={15} />
      This page was served by build {build.stamp ?? "?"}; the {other?.[0] ?? "other half"} runs {other?.[1]?.stamp ?? "a different one"}, so nothing here can be trusted until they match.
    </div>
  );
}

/** The factory's verdict, as the server words it, and how fresh this page's view of it is. */
function FloorBar({ project }: { project: string }) {
  const floor = useFloor(project);
  const engineAt = useLive((st) => st.engineAt);
  const link = useLive((st) => st.engine);
  const unread = useLive((st) => st.jobsUnread);
  const now = useNow();
  const pickup = usePickup();
  const f = floor.data as FloorRead | undefined;
  // A quiet floor sends nothing: while the stream is open, silence is "nothing changed". Only a
  // stream that is down, with the last read old, makes what is shown stale.
  const lastRead = Math.max(engineAt ?? 0, floor.dataUpdatedAt || 0);
  const stale = link !== "live" && lastRead > 0 && now - lastRead > STALE_AFTER_MS;
  const census = f?.census;
  const level = floor.isError && !f ? "unknown" : (f?.level ?? "unknown");

  return (
    <section className={s.floor} aria-label="The floor" data-level={level}>
      <div className={s.sentence} aria-live="polite">
        {floor.isPending ? (
          <Skeleton w={420} h={22} />
        ) : !f ? (
          <h1>Unknown — this page could not read the floor. {floor.error instanceof Error ? floor.error.message : ""}</h1>
        ) : (
          <h1>
            <span className={s.word}>{f.word}</span> — {f.clause}
          </h1>
        )}
        {f?.detail && <p className={s.detail}>{f.detail}</p>}
      </div>
      {census && !project && (
        <div className={s.chips}>
          {(["working", "needs", "clock", "armed", "stopped"] as const)
            .filter((k) => census[k] || k === "working" || k === "needs")
            .map((k) => (
              <Chip key={k}>
                <Dot tone={k === "working" ? "run" : k === "needs" || k === "stopped" ? "alarm" : k === "clock" ? "clock" : "idle"} />
                <b>{census[k] ?? 0}</b> {{ working: "working", needs: "need you", clock: "waiting", armed: "armed", stopped: "stopped" }[k]}
              </Chip>
            ))}
        </div>
      )}
      <div className={s.fresh} data-stale={stale || unread || undefined}>
        {unread
          ? "The engine did not answer — showing the last list it gave"
          : stale
            ? `Not live — last read ${ago(new Date(lastRead).toISOString(), now)}`
            : link === "live"
              ? engineAt
                ? `Last change ${ago(new Date(engineAt).toISOString(), now)}`
                : "Live"
              : lastRead
                ? `Read ${ago(new Date(lastRead).toISOString(), now)} · reconnecting`
                : ""}
      </div>
      {f?.actions?.some((a) => a.key === "enable") && (
        <div className={s.floorActions}>
          {f.actions
            .filter((a) => a.key === "enable" && a.project)
            .map((a) => (
              <button key={a.project} type="button" className={s.floorAction} onClick={() => pickup.mutate({ project: a.project!, enabled: true })}>
                {a.label}
              </button>
            ))}
        </div>
      )}
      {f?.also && f.also.length > 0 && (
        <ul className={s.also}>
          {f.also.map((c) => (
            <li key={`${c.cause}${c.project}${c.clause}`} data-level={c.level}>
              <Dot tone={c.level === "err" || c.level === "warn" ? "alarm" : c.level === "clock" ? "clock" : "idle"} />
              Also — {c.clause}
              {c.cmd && <code>{c.cmd}</code>}
            </li>
          ))}
          {(f.also_more ?? 0) > 0 && <li className={s.more}>and {f.also_more} more</li>}
        </ul>
      )}
    </section>
  );
}
