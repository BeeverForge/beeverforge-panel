// The dashboard's charts, drawn here in the panel's own colours: no chart library, nothing fetched.
import { useId, useState } from "react";
import { money } from "../../live/clock";
import s from "./costs.module.css";

/** Spend per day as a filled line; every day of the window is on the axis, empty ones at zero. */
export function DayChart({ byDay, height = 180 }: { byDay: Record<string, number>; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const days = Object.keys(byDay).sort();
  if (!days.length) return <p className={s.none}>No spend in this window.</p>;
  const first = new Date(days[0]!);
  const last = new Date(days[days.length - 1]!);
  const all: string[] = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) all.push(d.toISOString().slice(0, 10));
  const vals = all.map((d) => byDay[d] ?? 0);
  const max = Math.max(...vals, 0.01);
  const W = 600;
  const H = height;
  const pad = { l: 40, r: 8, t: 10, b: 22 };
  const x = (i: number) => pad.l + (all.length === 1 ? 0 : (i / (all.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(vals.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  const ticks = [0, max / 2, max];
  return (
    <figure className={s.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{`Spend per day, ${all[0]} to ${all[all.length - 1]}; highest ${money(max)}`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={s.grid} />
            <text x={pad.l - 6} y={y(t) + 3} className={s.axis} textAnchor="end">
              ${t.toFixed(t < 10 ? 1 : 0)}
            </text>
          </g>
        ))}
        <path d={area} className={s.area} />
        <path d={line} className={s.line} />
        {all.map((d, i) => (
          <rect key={d} x={x(i) - (W / all.length) / 2} y={pad.t} width={W / all.length} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className={s.cursor} />
            <circle cx={x(hover)} cy={y(vals[hover]!)} r={3.5} className={s.point} />
          </g>
        )}
        <text x={pad.l} y={H - 6} className={s.axis}>
          {all[0]}
        </text>
        <text x={W - pad.r} y={H - 6} className={s.axis} textAnchor="end">
          {all[all.length - 1]}
        </text>
      </svg>
      <figcaption className={s.caption} aria-live="polite">
        {hover !== null ? `${all[hover]} — ${money(vals[hover])}` : `${all.length} days · highest day ${money(max)}`}
      </figcaption>
    </figure>
  );
}

/** A share of spend as labelled bars: easier to compare than a doughnut. */
export function Bars({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(([, v]) => v), 0.01);
  const total = rows.reduce((t, [, v]) => t + v, 0);
  if (!rows.length) return <p className={s.none}>Nothing in this window.</p>;
  return (
    <ul className={s.bars}>
      {rows.map(([k, v]) => (
        <li key={k}>
          <span className={s.barLabel}>{k}</span>
          <span className={s.barTrack} aria-hidden="true">
            <span className={s.barFill} style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className={s.barValue}>
            {money(v)} <span>{total ? Math.round((v / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
