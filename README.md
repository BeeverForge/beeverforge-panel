# BeeverForge Panel

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guidelines and checks.

The BeeverForge panel, rebuilt in React. It is a client of the core
([BeeverForge/beeverforge-oss](https://github.com/BeeverForge/beeverforge-oss)) and uses its public
front-end API only
([`the-front-end-api.md`](https://github.com/BeeverForge/beeverforge-oss/blob/main/docs/reference/the-front-end-api.md)):
the versioned `/api/v1/` reads, the catalogued actions, the two server-sent-event streams and the
two sockets. The core is headless; this panel replaces the page it still serves today
(`beeverforge/api/panel.html`), as the core's ADR-0059 records
([BeeverForge/beeverforge-oss#590](https://github.com/BeeverForge/beeverforge-oss/pull/590)).

**Not shipped yet.** A deployment still serves the core's `panel.html`. The panel will reach a
deployment as an image of its own that the core's compose file starts, serving the built files and
passing `/api` to the core on the same origin. The work is tracked in the milestone
[The new panel](https://github.com/BeeverForge/beeverforge-panel/milestones).

What it is for: the operator who keeps the floor open all day. Every production line is on one
screen, each live card sits at the station it has reached and moves when the server says it moved,
and what needs a person is answered on the card itself. See [COMPARISON.md](COMPARISON.md) for the
side-by-side with the default panel, measured on the same live floor.

## Run it

Node 24 LTS, npm 11.17 or later, and Python 3.12 or later for the rig. The rig's API runs in WSL
on Windows, or directly on Linux and macOS (its registry takes a POSIX file lock).

```bash
npm run setup           # npm ci, then only the reviewed install scripts
npm run rig:install     # once: a venv with the core at contract/core-ref, for the rig
npm run rig:serve       # terminal 1 — the API on :8788, with a registry of its own
npm run rig:seed        # once — 4 synthetic projects, 25 cards, 7 requirements
npm start               # terminal 2 — the factory simulator on :8790 and the panel on :5173
```

Open <http://127.0.0.1:5173/>. The default panel reads the same live floor at
<http://127.0.0.1:8790/>, so the two can be compared side by side.

To try the panel against a change to the core before it is merged, point the rig at a checkout:
`BEEVERFORGE_CORE=../beeverforge-oss npm run rig:install`.

Against a real deployment instead (for example `docker compose up` on :8787):

```bash
npm run dev:live        # the panel on :5173, every /api call to :8787 (.env.live)
```

## The contract

`contract/` holds the core's `openapi.json` and `events.schema.json` at one commit of the core,
named in `contract/core-ref`; the types in `src/api/generated/` are generated from them, and the rig
installs the core at the same commit. [contract/README.md](contract/README.md) says how to move to
a newer core.

## The test bed

| piece | what it is | where |
|---|---|---|
| the rig | the core's own API, served with a registry, board, journal, metrics store and `HOME` of its own under `~/.panel-rig`. No worker and no engine run, and the engine address is a closed port, so nothing registered there is ever picked up by a real agent or spends a harness token | `scripts/rig.bash` |
| the seed | writes the synthetic projects and cards through the public API, and commits the synthetic requirements into each product's context repository | `scripts/seed.ts`, `sim/fixtures.ts`, `sim/requirements/` |
| the factory simulator | a reverse proxy in front of the rig that answers, itself, every route only an engine and a worker could answer — the jobs and their streams, their logs, the floor's verdict, what needs a person, the tech lead, spend, previews and the product role's replies — and passes everything else through. It picks cards up from the real TO-DO column and walks each one through the real stations with scripted outcomes | `sim/` |

Everything in the seed is invented: no customer, no real code.

The simulator's controls, for a demo or a test:

```bash
SIM_SPEED=3 npm run sim                                    # three times faster
SIM_FORCE="tidepool-mobile=decision,quarry-api=prod_approval" npm run sim
curl -X POST "127.0.0.1:8790/__sim/force?project=atlas-docs&outcome=fail_hold"   # its next card
curl -X POST "127.0.0.1:8790/__sim/stage?project=atlas-docs&outcome=merge_rejected"  # now
curl 127.0.0.1:8790/__sim                                  # what is live right now
```

`force` sets the outcome of the project's next card, so it waits for whatever the line is doing.
`stage` ends what the line is doing and starts a card on the outcome at once, skipping the spec
check; a test that needs one state uses it.

Outcomes: `merge_human`, `merge_rejected` (the merge gate after the review rejected it),
`merge_auto`, `decision`, `repair_then_merge`, `rate_limit`, `fail_hold`, `prod_approval`, `wedged`.
The simulator keeps its runs in memory: restarting it puts the cards it was working on back to
where the board holds them.

`npm run rig:reset` stops the rig and deletes everything it wrote.

## How it stays live

```
/api/temporal/stream (SSE) ─┐  every frame → the engine query's cache entry,
                            │  then the reads the server derives from the jobs (the floor's
                            │  sentence, what needs you, boards, the run's details) are asked once
                            │  per burst — not on a timer
/api/stream (WebSocket) ────┤  projects and the tech lead's conversation, pushed per project
/api/jobs/…/stream (SSE) ───┤  a run's log, shared by every view that shows it; resumes with
                            │  Last-Event-ID; at most four at once, past that read on change
/api/product/stream (WS) ───┘  the product conversation, one socket per conversation on screen
```

Polling only runs while a stream is down (20 s for the jobs and the floor, 15 s for what needs
you, 30 s for the tech lead's narration). While the streams are up, a quiet floor makes no
requests at all. What this browser asked of a job shows on its card at once and clears the moment
the engine's next frame for that job lands.

## Layout of the source

| path | what |
|---|---|
| `contract/` | the core's API contract at `core-ref` |
| `src/api/` | the typed client: `generated/` from `contract/` (`npm run gen:types`), `types.ts` for the fields the server writes into untyped dicts, `queries.ts`, `actions.ts`, `http.ts` |
| `src/live/` | the streams, the station model (`pipeline.ts`), one clock for every timer |
| `src/features/floor/` | the cabinet (lines × stations), Needs you, recently finished |
| `src/features/line/` | one line in depth: the live station strip, its log, the tech lead, how it runs, its runs |
| `src/features/board/` | the board, the card drawer, the card form with pickup's live verdict, pull requests, previews |
| `src/features/logs/`, `costs/`, `product/` | every run's log; spend, autonomy and the knowledge-map A/B; the product owner's room |
| `src/features/answer/` | every answer a person gives the floor, drawn the same wherever it is asked |
| `src/styles/tokens.css` | the design tokens, both themes |
| `PRODUCT.md`, `DESIGN.md`, `.impeccable/` | the product record and the design direction this was built to |

## Checks

CI runs installation, typecheck, lint, unit tests, the production build, the dependency policy and
the Playwright suite on both Linux and Windows for each pull request. On Windows, the browser and
panel run natively and the core API runs in WSL. Shellcheck runs on Linux. The required `check`
passes only if both platforms and both browser runs succeed.

```bash
npm run typecheck && npm run lint
npm test                # unit: the stream merge, the station model
npm run e2e             # end to end against the simulator: the live floor, answering, the board,
                        # the product room, axe accessibility, phone widths (needs `npm start`)
npm run build           # the production bundle in dist/
```

## Recording a demo

`scripts/demo.mjs` drives a real browser through a captioned tour (the floor, a decision, a merge,
a line, the board, the product room, costs, ⌘K, the light theme) and saves it to
`docs/demo/panel-demo.webm` (git-ignored). Start the simulator with the outcomes the tour needs
(the command is at the top of the script), then `node scripts/demo.mjs`. About 100 seconds. The
cursor and captions are drawn into the recording only.

## Known gaps

- **Not shipped.** It runs on its own dev server; no image serves the build yet.
- **The product role's replies are the simulator's**, a few fixed patterns; a real deployment's
  come from its worker. Requirements, documents, the system map and the agenda are the rig's own.
- **The brand name** comes from `VITE_BRAND` rather than the server's `BEEVERFORGE_PLATFORM_NAME`,
  which the server writes only into its own page.
- **A board read by a product-only credential** opens the product room rather than a read-only
  board.
- **The product room cannot switch product**: it opens on the first one.

## Licence

Apache-2.0, like the core: see [LICENSE](LICENSE) and [NOTICE](NOTICE).
