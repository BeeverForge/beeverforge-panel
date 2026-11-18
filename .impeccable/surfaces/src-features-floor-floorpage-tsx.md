---
version: 1
slug: "src-features-floor-floorpage-tsx"
primary_target: "src/features/floor/FloorPage.tsx"
related_targets: ["src/app/Shell.tsx"]
---

## Scope

The operator's floor in the React panel: the shell, the floor overview, a project's line, and every surface reached from them (board, logs, costs, product room). Visitor mode: Operate.

## Audience, job, constraints

The operator keeps it open all day on a second screen: glance to know the factory moves, act when it asks. Success: feels alive in real time, answering is fastest, never blank or janky, a newcomer understands it. Server sentences only; unread is never empty; zero outbound requests (fonts bundled); dark default plus light; WCAG 2.2 AA; usable from 320 px.

## Chosen direction and memorable moment

The Kanban Post (seed:84c02e56751fec33), chosen by the user from the decision page; the approved sketch is `.impeccable/mocks/decision/assigned.html`. Memorable moment: a card slides into the next station's pigeonhole the moment the server says it moved, and a held card turns over to its red reverse with the answer on it.

## Direction contract

THESIS: The floor is a kanban post: one row per production line, one pigeonhole per station, and every live card sits as a sleeved kanban in the slot where it is. It refuses the category default of a status table with pills and a separate inbox that sends you elsewhere to answer.

OWN-WORLD: One ink cabinet field (#1F1F24 on a #151518 ground) ruled by hairline slot dividers; cards are cream card stock (#FAF9F6) with black print and a gold band (#D4A24C) for running; a held card is a red reversed plate (#C2372D) with cream text — the only reversed plate on screen. Archivo for the interface, Archivo at a narrow width for card stock, tabular numerals. Flat committed fields: no gradients, glows or grain. Green ticks for passed stations, dashed slots for what is idle.

STORY: The operator sees every line at once and where each card stands; understands from the floor sentence whether the factory is working; and answers what needs them on the card itself or in the Needs you column, without opening anything.

FIRST VIEWPORT: Top bar 56 px: mark and name, live link state, Costs and Board, theme, Find ⌘K. Floor sentence row 68 px: the server's sentence at 24 px with census chips and freshness on the right. Below, a two-column grid: the cabinet (rows = projects with name, state word and position; columns = Spec, Prep, Plan, Code, Test, Review, PR, Merge; done slots show a tick and their time, the live card sits in its slot with number, cost, title and elapsed time right-aligned; an armed line is one dashed slot across) and on the right a 340 px Needs you column whose items carry their answer buttons. Recently shipped runs below the cabinet.

FORM: Toyota withdrawal kanban and the heijunka levelling box, position 5 of the grounded list, assigned by the roll and kept by the user. Seed: seed:84c02e56751fec33. Raised by the declined challengers: rank by weight and reversal with one reversed plate (timetable rack); one station mark at every size (bitmap specimen); answering lifts the card and dims the rest (streaming wall); times right-aligned against the slot edge (cassette j-card); flat committed fields (guide map).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
