// One drawn icon set: 16 px grid, 1.5 px stroke, round caps. Decorative by default (aria-hidden);
// the control that holds an icon carries the name.
import type { SVGProps } from "react";

const PATHS = {
  search: <><circle cx="7" cy="7" r="4.75" /><path d="M10.6 10.6 14 14" /></>,
  theme: <><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" /></>,
  board: <><rect x="2" y="2.5" width="3.5" height="11" rx="1" /><rect x="6.25" y="2.5" width="3.5" height="7" rx="1" /><rect x="10.5" y="2.5" width="3.5" height="9" rx="1" /></>,
  costs: <><path d="M2.5 13.5h11" /><path d="M4 11V8" /><path d="M7 11V4.5" /><path d="M10 11V6.5" /><path d="M13 11V3" /></>,
  logs: <><path d="M3 4h10" /><path d="M3 8h10" /><path d="M3 12h6" /></>,
  product: <><path d="M3 3.5h10v7H8l-3 2.5v-2.5H3z" /></>,
  check: <path d="m3.5 8.5 3 3 6-7" />,
  close: <><path d="m4 4 8 8" /><path d="m12 4-8 8" /></>,
  chevronRight: <path d="m6 3.5 4.5 4.5L6 12.5" />,
  chevronDown: <path d="m3.5 6 4.5 4.5L12.5 6" />,
  arrowLeft: <><path d="M13 8H3" /><path d="m7 4-4 4 4 4" /></>,
  external: <><path d="M9.5 2.5h4v4" /><path d="M13.5 2.5 8 8" /><path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" /></>,
  play: <path d="M5 3.5v9l7-4.5z" />,
  skip: <><path d="M4 3.5v9l6-4.5z" /><path d="M12.5 3.5v9" /></>,
  merge: <><circle cx="4.5" cy="3.5" r="1.5" /><circle cx="4.5" cy="12.5" r="1.5" /><circle cx="11.5" cy="8" r="1.5" /><path d="M4.5 5v6" /><path d="M4.5 5c0 3 2.5 3 5.5 3" /></>,
  pause: <><path d="M5.5 3.5v9" /><path d="M10.5 3.5v9" /></>,
  stop: <rect x="4" y="4" width="8" height="8" rx="1" />,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
  alert: <><path d="M8 2.5 14 13H2z" /><path d="M8 6.5v3" /><path d="M8 11.25v.25" /></>,
  refresh: <><path d="M13 4.5V2.5" /><path d="M13 4.5h-2" /><path d="M12.6 4.4A5.5 5.5 0 1 0 13.5 8" /></>,
  edit: <><path d="M10.5 3 13 5.5 6 12.5H3.5V10z" /></>,
  plus: <><path d="M8 3v10" /><path d="M3 8h10" /></>,
  more: <><circle cx="3.5" cy="8" r=".75" fill="currentColor" /><circle cx="8" cy="8" r=".75" fill="currentColor" /><circle cx="12.5" cy="8" r=".75" fill="currentColor" /></>,
  scan: <><path d="M2.5 5.5v-3h3" /><path d="M10.5 2.5h3v3" /><path d="M13.5 10.5v3h-3" /><path d="M5.5 13.5h-3v-3" /><path d="M5 8h6" /></>,
  rocket: <><path d="M8 2c2.5 1.5 3.5 4 3.5 6.5l-1.5 2h-4l-1.5-2C4.5 6 5.5 3.5 8 2z" /><circle cx="8" cy="6.5" r="1" /><path d="M6.5 12.5 8 14l1.5-1.5" /></>,
  paperclip: <path d="M10.5 5 6 9.5a1.4 1.4 0 0 0 2 2L13 6.5a2.8 2.8 0 0 0-4-4L4 7.5a4.2 4.2 0 0 0 6 6L13.5 10" />,
  send: <><path d="M8 13V3" /><path d="m4 7 4-4 4 4" /></>,
  file: <><path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" /></>,
  user: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c.8-2.3 2.7-3.5 5-3.5s4.2 1.2 5 3.5" /></>,
  menu: <><path d="M2.5 4h11" /><path d="M2.5 8h11" /><path d="M2.5 12h11" /></>,
  link: <><path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5L8.5 4" /><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.5-.5" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** The beaver mark: cream strokes on the ink badge, its tail in gold. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1F1F24" />
      <g transform="translate(2 7) scale(.115)">
        <g transform="translate(-70 -115)" fill="none" stroke="#FAF9F6" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
          <path d="M164 243 C149 225 147 194 124 180 C105 168 88 174 79 187 C62 213 89 240 116 246 C133 250 149 248 164 243" stroke="#D4A24C" />
          <path d="M164 243 C158 218 170 183 198 164" />
          <path d="M198 164 C215 154 230 143 243 133 C237 120 252 113 262 125 C280 121 290 130 300 137 L308 141 C316 145 309 160 302 163 L292 166 C279 170 273 181 274 193 C274 213 263 233 249 241 C258 235 270 242 273 254" />
          <path d="M273 254 L194 254 C180 254 170 250 164 243" />
        </g>
      </g>
    </svg>
  );
}
