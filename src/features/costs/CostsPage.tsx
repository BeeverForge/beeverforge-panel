// What the factory cost, and what it bought: spend by day, model and harness, the time and cost of
// every task, how many cards merged untouched, and the knowledge-map A/B. Filters narrow spend by
// pass; autonomy is the card record's and is never re-filtered.
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "../../api/queries";
import type { Autonomy, MetricsTask } from "../../api/types";
import { duration, money } from "../../live/clock";
import { Button, Note, Skeleton } from "../../ui/Button";
import { Bars, DayChart } from "./Charts";
import s from "./costs.module.css";

const ARM: Record<string, { label: string; what: string }> = {
  injected: { label: "with map", what: "the agent was given the module map" },
  off: { label: "without map", what: "this project did not opt into the map" },
  unavailable: { label: "map unavailable", what: "opted in, but the map was not trustworthy for this checkout — it ran without it" },
  pre_okf: { label: "before the A/B", what: "ran before the arm was recorded; it demonstrably ran without the map" },
};
const arm = (k?: string | null) => k || "pre_okf";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const a = [...xs].sort((p, q2) => p - q2);
  const m = a.length >> 1;
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
};
const tok = (v: number | null) => (v == null ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));

type SortKey = "date" | "cost_usd" | "wall_s" | "turns" | "ticket";

export function CostsPage() {
  const search = useSearch({ from: "/costs" });
  const navigate = useNavigate({ from: "/costs" });
  const metrics = useQuery(q.metrics(search.project ?? ""));
  const d = metrics.data;
  const project = d?.project ?? search.project ?? "";
  const [f, setF] = useState({ model: "", harness: "", role: "", know: "", from: "", to: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });

  const view = useMemo(() => {
    const runs = (d?.runs ?? []).filter(
      (r) => (!f.model || r.model === f.model) && (!f.harness || r.harness === f.harness) && (!f.role || r.role === f.role) && (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to),
    );
    let tickets = new Set(runs.map((r) => r.ticket));
    let tasks = (d?.tasks ?? []).filter((t) => tickets.has(t.ticket));
    if (f.know) {
      tasks = tasks.filter((t) => (arm(t.knowledge) === "injected") === (f.know === "with"));
      tickets = new Set(tasks.map((t) => t.ticket));
    }
    const kept = runs.filter((r) => tickets.has(r.ticket));
    const cost = kept.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);
    const walls = tasks.map((t) => t.wall_s ?? 0).filter((x) => x > 0);
    const sumBy = (k: "date" | "model" | "harness") =>
      kept.reduce<Record<string, number>>((acc, r) => {
        const key = String(r[k] ?? "unknown");
        acc[key] = (acc[key] ?? 0) + (r.cost_usd ?? 0);
        return acc;
      }, {});
    return { runs: kept, tasks, cost, count: tickets.size, avgWall: walls.length ? walls.reduce((a, b) => a + b, 0) / walls.length : null, byDay: sumBy("date"), byModel: sumBy("model"), byHarness: sumBy("harness") };
  }, [d, f]);

  const options = (k: "model" | "harness" | "role") => [...new Set((d?.runs ?? []).map((r) => r[k]).filter(Boolean))] as string[];
  const sorted = [...view.tasks].sort((a, b) => {
    const av = a[sort.key] ?? 0;
    const bv = b[sort.key] ?? 0;
    return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
  });
  const th = (key: SortKey, label: string, num = false) => (
    <th className={num ? s.num : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((st) => ({ key, dir: st.key === key ? (st.dir === 1 ? -1 : 1) : -1 }))}>
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Costs</h1>
          <div className={s.tabs} role="tablist" aria-label="Project">
            {(d?.projects ?? []).map((p) => (
              <Link key={p} to="/costs" search={{ project: p }} role="tab" aria-selected={p === project} className={s.tab}>
                {p}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {metrics.isPending ? (
        <div className={s.figures}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} w={120} h={48} style={{ marginRight: 28 }} />
          ))}
        </div>
      ) : metrics.isError || !d ? (
        <Note tone="alarm" icon="alert">
          Spend could not be read — {(metrics.error as Error | null)?.message ?? "no answer"}.
        </Note>
      ) : (
        <>
          <div className={s.filters} role="group" aria-label="Filters">
            <Select label="Model" value={f.model} onChange={(v) => setF({ ...f, model: v })} options={options("model")} />
            <Select label="Harness" value={f.harness} onChange={(v) => setF({ ...f, harness: v })} options={options("harness")} />
            <Select label="Role" value={f.role} onChange={(v) => setF({ ...f, role: v })} options={options("role")} />
            <Select label="Map" value={f.know} onChange={(v) => setF({ ...f, know: v })} options={["with", "without"]} names={{ with: "with the map", without: "without the map" }} />
            <label className={s.field}>
              <span>From</span>
              <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
            </label>
            <label className={s.field}>
              <span>To</span>
              <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
            </label>
            {Object.values(f).some(Boolean) && (
              <Button tier="quiet" size="sm" onClick={() => setF({ model: "", harness: "", role: "", know: "", from: "", to: "" })}>
                Clear filters
              </Button>
            )}
          </div>

          <dl className={s.figures}>
            <Figure k="spent" v={money(view.cost)} />
            <Figure k="tasks" v={String(view.count)} />
            <Figure k="per task" v={money(view.count ? view.cost / view.count : 0)} />
            <Figure k="time per task" v={duration(view.avgWall ? view.avgWall * 1000 : null)} />
          </dl>

          <div className={s.charts}>
            <section className={s.box}>
              <h2>Spend per day</h2>
              <DayChart byDay={view.byDay} />
            </section>
            <section className={s.box}>
              <h2>By model</h2>
              <Bars data={view.byModel} />
              <h2 className={s.second}>By harness</h2>
              <Bars data={view.byHarness} />
            </section>
          </div>

          {d.autonomy && <AutonomyBlock a={d.autonomy} />}
          <KnowledgeAB tasks={view.tasks} />

          <section className={s.box}>
            <h2>Tasks — the time and cost of each</h2>
            {!sorted.length ? (
              <p className={s.none}>No task matches these filters.</p>
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      {th("ticket", "#")}
                      <th>Title</th>
                      {th("date", "Date")}
                      <th>Model</th>
                      <th>Harness</th>
                      <th>Map</th>
                      {th("turns", "Turns", true)}
                      {th("wall_s", "Time", true)}
                      {th("cost_usd", "Cost", true)}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t) => (
                      <tr key={`${t.ticket}${t.date}`}>
                        <td>#{t.ticket}</td>
                        <td className={s.title}>{t.title || "—"}</td>
                        <td>{t.date}</td>
                        <td>{t.model}</td>
                        <td>{t.harness}</td>
                        <td>
                          <span className={s.arm} data-arm={arm(t.knowledge)} title={ARM[arm(t.knowledge)]?.what}>
                            {ARM[arm(t.knowledge)]?.label}
                          </span>
                        </td>
                        <td className={s.num}>{t.turns ?? "—"}</td>
                        <td className={s.num}>{duration(t.wall_s ? t.wall_s * 1000 : null)}</td>
                        <td className={s.num}>{money(t.cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {search.project && !d?.projects?.includes(search.project) && d && (
        <p className={s.none}>
          No spend recorded for “{search.project}”. <button type="button" className={s.link} onClick={() => void navigate({ search: {} })}>Show the first project</button>
        </p>
      )}
    </div>
  );
}

/** A figure and what it counts, read value first. */
function Figure({ k, v }: { k: string; v: string }) {
  return (
    <div className={s.figure}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Select({ label, value, onChange, options, names }: { label: string; value: string; onChange: (v: string) => void; options: string[]; names?: Record<string, string> }) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {names?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** How many cards merged untouched — every word the server's, in the project's language. */
function AutonomyBlock({ a }: { a: Autonomy }) {
  const said = a.said ?? {};
  const L = said.labels ?? {};
  if (a.readable === false) {
    return (
      <section className={s.box}>
        <h2>{L.title}</h2>
        <Note tone="alarm">{said.headline}</Note>
      </section>
    );
  }
  const pct = a.yield == null ? "—" : `${Math.round(a.yield * 100)}%`;
  const depth = Object.entries(a.repair_depth ?? {});
  const maxDepth = Math.max(...depth.map(([, n]) => n), 1);
  return (
    <section className={s.box}>
      <h2>{L.title}</h2>
      <dl className={s.facts}>
        <Figure k={L.yield ?? "merged untouched"} v={pct} />
        <Figure k={L.rework ?? "code passes per card"} v={a.rework_rate == null ? "—" : a.rework_rate.toFixed(2)} />
        <Figure k={L.measured ?? "measured"} v={String(a.measured ?? 0)} />
        <Figure k={L.before ?? "before the record"} v={String(a.before_the_record?.length ?? 0)} />
      </dl>
      <p className={s.said}>
        {said.headline} {said.rework} {said.before_the_record}
      </p>
      <p className={s.scope}>{said.scope}</p>
      <div className={s.pair}>
        <div>
          <h3>{L.depth}</h3>
          <ul className={s.bars}>
            {depth.map(([k, n]) => (
              <li key={k}>
                <span className={s.barLabel}>{k}</span>
                <span className={s.barTrack} aria-hidden="true">
                  <span className={s.barFill} data-tone={k === "0" ? "ok" : undefined} style={{ width: `${(n / maxDepth) * 100}%` }} />
                </span>
                <span className={s.barValue}>
                  {n} {L.cards}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{L.parks}</h3>
          {Object.keys(a.park_reasons ?? {}).length ? (
            <ul className={s.parks}>
              {Object.entries(a.park_reasons ?? {}).map(([c, n]) => (
                <li key={c}>
                  <span>{said.causes?.[c] ?? c}</span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.none}>{said.parks}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The knowledge-map A/B, recomputed from the filtered tasks so it never contradicts the table. */
function KnowledgeAB({ tasks }: { tasks: MetricsTask[] }) {
  const arms: Record<string, MetricsTask[]> = {};
  for (const t of tasks) (arms[arm(t.knowledge)] ??= []).push(t);
  const base = arms.pre_okf;
  delete arms.pre_okf;
  const names = Object.keys(arms).sort();
  if (!names.length) return null;
  const stat = (ts: MetricsTask[]) => ({
    n: ts.length,
    tok: median(ts.map((t) => t.tokens ?? 0).filter(Boolean)),
    cost: median(ts.map((t) => t.cost_usd ?? 0)),
    wall: median(ts.map((t) => t.wall_s ?? 0).filter(Boolean)),
    turns: ts.reduce((s2, t) => s2 + (t.turns ?? 0), 0) / (ts.length || 1),
  });
  const st = Object.fromEntries(names.map((k) => [k, stat(arms[k]!)]));
  const t = st.injected;
  const ctl = ["off", "unavailable"].find((k) => st[k]);
  const delta = (a: number | null, b: number | null) => (a != null && b ? Math.round(((a - b) / b) * 100) : null);
  return (
    <section className={s.box}>
      <h2>Knowledge map — A/B</h2>
      {t && ctl && (
        <p className={s.said}>
          Against “{ARM[ctl]?.label}”, medians with the map: tokens {fmtDelta(delta(t.tok, st[ctl]!.tok))}, cost {fmtDelta(delta(t.cost, st[ctl]!.cost))}, time {fmtDelta(delta(t.wall, st[ctl]!.wall))}. Arithmetic, not a verdict: it holds only if the mix of tickets is similar.
        </p>
      )}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Arm</th>
              <th className={s.num}>Tasks</th>
              <th className={s.num}>Median tokens</th>
              <th className={s.num}>Median cost</th>
              <th className={s.num}>Median time</th>
              <th className={s.num}>Mean turns</th>
            </tr>
          </thead>
          <tbody>
            {names.map((k) => (
              <tr key={k}>
                <td>
                  <span className={s.arm} data-arm={k} title={ARM[k]?.what}>
                    {ARM[k]?.label ?? k}
                  </span>
                </td>
                <td className={s.num}>{st[k]!.n}</td>
                <td className={s.num}>{tok(st[k]!.tok)}</td>
                <td className={s.num}>{money(st[k]!.cost)}</td>
                <td className={s.num}>{duration(st[k]!.wall ? st[k]!.wall! * 1000 : null)}</td>
                <td className={s.num}>{st[k]!.turns.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {base && (
        <p className={s.scope}>
          Before the A/B: {base.length} tickets ran without the map · {tok(median(base.map((x) => x.tokens ?? 0).filter(Boolean)))} median tokens · {money(median(base.map((x) => x.cost_usd ?? 0)))} median. A reference, not comparable with the arms above.
        </p>
      )}
    </section>
  );
}

const fmtDelta = (p: number | null) => (p == null ? "—" : `${p > 0 ? "+" : ""}${p}%`);
