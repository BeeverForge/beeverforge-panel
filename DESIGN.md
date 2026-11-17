---
name: BeeverForge Panel
description: The operator's floor as a kanban post, where every live card sits in its station's pigeonhole and the one thing that needs a person turns red.
colors:
  brand-ink: "#1f1f24"
  brand-cream: "#faf9f6"
  brand-gold: "#d4a24c"
  ground: "#151518"
  cabinet: "#1f1f24"
  raised: "#26262c"
  rule: "#2f2f37"
  slot: "#3d3d46"
  rule-strong: "#4a4a53"
  text: "#faf9f6"
  text-2: "#b6b5af"
  text-3: "#8e8d95"
  text-4: "#84838b"
  card: "#faf9f6"
  card-ink: "#1f1f24"
  card-2: "#4b4942"
  card-3: "#68665e"
  card-ok: "#17713f"
  run: "#d4a24c"
  ok: "#3ddc84"
  ok-ink: "#1f1f24"
  ok-wash: "rgb(61 220 132 / 0.1)"
  alarm: "#f47870"
  alarm-wash: "rgb(244 120 112 / 0.12)"
  plate: "#c2372d"
  plate-text: "#faf9f6"
  plate-2: "#fdeeeb"
  clock: "#8fb4e8"
  link: "#72b6ff"
  idle: "#6b6a72"
  focus: "#72b6ff"
  scrim: "rgb(10 10 12 / 0.62)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  title:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  subtitle:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.38
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "\"tnum\""
  small:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\""
  caption:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "\"tnum\""
  card-title:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.18
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 84"
  card-meta:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 84"
  mono:
    fontFamily: "ui-monospace, SF Mono, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  r-1: "3px"
  r-2: "5px"
  r-3: "6px"
  overlay: "10px"
  pill: "999px"
spacing:
  cell: "6px"
  stack: "10px"
  inset: "14px"
  gutter-narrow: "12px"
  column-gap: "22px"
  gutter: "24px"
  topbar: "56px"
  line-col: "172px"
  needs-col: "340px"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.r-2}"
    padding: "0 11px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "#dad9d7"
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.r-2}"
    padding: "0 11px"
    height: "30px"
  button-plain-hover:
    backgroundColor: "rgb(250 249 246 / 0.08)"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    rounded: "{rounded.r-2}"
    padding: "0 11px"
    height: "30px"
  button-quiet-hover:
    textColor: "{colors.text}"
  button-sm:
    padding: "0 9px"
    height: "26px"
  button-on-plate-primary:
    backgroundColor: "{colors.plate-text}"
    textColor: "{colors.plate}"
  button-on-stock-primary:
    backgroundColor: "{colors.card-ink}"
    textColor: "{colors.card}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "26px"
  cabinet:
    backgroundColor: "{colors.cabinet}"
    textColor: "{colors.text}"
    rounded: "{rounded.r-3}"
  kanban-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-ink}"
    typography: "{typography.card-title}"
    rounded: "0 0 3px 3px"
    padding: "7px 8px 8px"
  plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-text}"
    typography: "{typography.title}"
    rounded: "{rounded.r-1}"
    padding: "10px 14px 12px"
  ask-strip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-ink}"
    typography: "{typography.card-title}"
    rounded: "0 0 3px 3px"
    padding: "5px 8px 5px 12px"
    height: "44px"
  board-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-ink}"
    typography: "{typography.card-title}"
    rounded: "0 0 3px 3px"
    padding: "8px 10px 9px"
  station-tick:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.ok-ink}"
    rounded: "{rounded.pill}"
    size: "18px"
  needs-item:
    backgroundColor: "{colors.cabinet}"
    textColor: "{colors.text}"
    rounded: "{rounded.r-3}"
    padding: "12px 14px 14px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.r-2}"
    padding: "8px 10px"
  switch:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.pill}"
    width: "32px"
    height: "18px"
  switch-checked:
    backgroundColor: "{colors.text}"
  nav-item:
    textColor: "{colors.text-2}"
    rounded: "{rounded.r-3}"
    padding: "7px 10px"
  nav-item-active:
    backgroundColor: "rgb(250 249 246 / 0.09)"
    textColor: "{colors.text}"
  tab-selected:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  dialog:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.overlay}"
    width: "460px"
  toast:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.r-3}"
    padding: "12px 12px 12px 14px"
    width: "380px"
---

# Design System: BeeverForge Panel

## Overview

**Creative North Star: "The Kanban Post"**

The floor is a kanban post: one ink cabinet ruled into pigeonholes, one row per production line, one slot per station, and every live card sitting as a sleeved kanban in the slot where it is. Cards are cream card stock with black print, set narrow like a printed withdrawal kanban, and each carries a printed top band that says what it is doing. A card that is moving wears a gold band. When a card needs a person it stays in its slot and its ask opens beneath the stations: the oldest ask turns over to the one red reversed plate on screen, with the answer buttons on it, and every other ask is a single strip on the card's own stock.

The room is a dense, quiet control room kept open all day on a second screen. The interface says nothing while the factory moves and is unmistakable when it asks. Fields are flat and committed: ink on a darker ground, hairline rules for structure, cream only where there is a card, colour only where it carries a state. The world is dark by default with a light twin that keeps every rule. The chosen form is the Toyota withdrawal kanban and the heijunka levelling box; the refused category default is the status table with pills plus a separate inbox that sends the operator elsewhere to answer.

Confirmed rejections: gradients, glows and grain; a second reversed plate; decorative colour; type or icons loaded from another host.

**Key Characteristics:**
- One ink cabinet field ruled by hairlines into station pigeonholes; passed stations show a green tick and their time, empty slots are faint outlines, an idle line is one dashed slot across.
- Cream card stock with black print, set at 84% width, with a printed top band and square top corners.
- Gold only for a card that is moving; one red reversed plate per screen, for the oldest ask.
- Flat committed fields; shadows only for what has left the field.
- Archivo Variable throughout, bundled, with tabular numerals and times right-aligned against the slot edge.

## Colors

A near-neutral ink and cream kit with four state colours that each mean one thing; nothing on the floor is coloured for decoration.

### Primary
- **Kanban Gold** (#d4a24c): a card that is moving, and nothing else. The running card's 5px band and its blinking foot dot, the running line's state word, the census "working" dot, the line page's current station band and mark, the band on board cards in In progress and In review. It is the brand gold, so it is spent only on motion.

### Secondary
- **Reversed-Plate Red** (#c2372d): the one red plate for the oldest ask, the 3px band and bold kind word on every other ask strip, the held card's band and dot, the held pip, the line page's held station. Also every red mark printed on cream stock (a failed gate, a review warning on a strip), because it holds AA on cream.
- **Plate Blush** (#fdeeeb): secondary text on the plate (held-at, waited-for, the review verdict).
- **Signal Coral** (#f47870): red on ink. The floor sentence's "Needs you" word, warn and error state words, stale freshness, failed-run notes, the armed confirm button off the plate, error toasts and diff deletions. Never on cream. It is read as text on its own Alarm wash too, so it holds 4.5:1 there over the raised surface (4.61:1); #f0625a, the first coral, fell to 4.42:1 over the cabinet.

### Tertiary
- **Tick Green** (#3ddc84): passed. The 18px station tick (with Black Print check), passed pips, the "deployed" and "live" dots, diff additions, the Done column band.
- **Printed Green** (#17713f): green printed on cream stock (passed gates on a card).
- **Pause Blue** (#8fb4e8): paused or waiting on the clock. A card paused on a usage limit takes a blue band and a still blue dot; clock-level state words.
- **Link Blue** (#72b6ff): links and the focus ring (the focus token shares this value).

### Neutral
- **Night Floor** (#151518): the room behind everything; the top bar; inputs and log feeds sit back on it.
- **Cabinet Ink** (#1f1f24): the cabinet, panels, Needs you items, board columns, requirement cards.
- **Raised Ink** (#26262c): overlays (dialogs, drawers, palette, toasts), chat messages, switch track.
- **Hairline** (#2f2f37), **Slot Edge** (#3d3d46), **Strong Rule** (#4a4a53): cabinet dividers and container borders; empty-slot and dashed idle outlines; button and overlay borders.
- **Cream Print** (#faf9f6), **Warm Grey** (#b6b5af), **Muted Pewter** (#8e8d95), **Faint Pewter** (#84838b): text on ink, from primary to the faintest legible (log times, n/a dashes).
- **Card Stock** (#faf9f6), **Black Print** (#1f1f24), **Stock Grey** (#4b4942), **Stock Faint** (#68665e): the card's paper and its print, from title to card number and cost.
- **Idle Pewter** (#6b6a72): the dot for idle or stopped.
- **Brand Ink / Cream / Gold** (#1f1f24 / #faf9f6 / #d4a24c): the brand kit. Unlike the role tokens they do not change in the light theme; the beaver mark (cream strokes, gold tail, ink badge) and the armed answer on the plate use them.

**Light twin.** `:root[data-theme="light"]` in `src/styles/tokens.css` redefines every role token: the ground and cabinet turn to pale stone, card stock goes pure white, gold deepens to a burnt ochre and the reds and greens darken so each keeps AA on its new field. Components use role tokens only, so they need no light-theme code. The product owner chose dark as the default; `prefers-color-scheme` does not pick the theme.

### Named Rules
**The Gold Means Moving Rule.** Gold marks a card that is moving and nothing else. State words for other states, switches, selected segments, armed confirmations, warnings, highlights and charts are never gold; the checked switch is the text colour (cream on dark, ink on light).

**The One Reversed Plate Rule.** Exactly one red reversed plate is on screen: the oldest ask. Every other ask is a single strip on cream stock with a 3px red band. Ink containers are never reversed.

**The Plate Red On Stock Rule.** Red text or marks on cream stock use Reversed-Plate Red; Signal Coral is for ink only, because it fails contrast on cream.

## Typography

**Display Font:** Archivo Variable (bundled through Fontsource with the width axis; fallbacks Archivo, ui-sans-serif, system-ui)
**Body Font:** Archivo Variable
**Label/Mono Font:** Archivo Variable for labels; the ui-monospace stack only for code, commands and diffs

**Character:** One sturdy grotesque does all the work. The interface sets it at normal width; card stock sets the same family narrow, at 84% on the width axis, so a card reads as printed matter without a second typeface. Numerals are tabular everywhere, so ticking times and costs never shift.

### Hierarchy
- **Display** (600, 24px, 1.2, -0.02em): the floor sentence, balanced across lines; page titles (Board, a line's name, Costs) use the same size at 700. Drops to 18px under 700px.
- **Headline** (600, 18px, 1.25, -0.01em): the live station's card title on the line page, the idle line's state word (700), section figures.
- **Title** (600, 15px, 1.3, -0.01em): section heads (Needs you, Recently finished, Runs, Tech lead), dialog titles, the brand name (700), and the plate's question.
- **Subtitle** (600, 14px, -0.01em): line names in the cabinet; the Needs you question uses 14px at 400 with 1.38 leading.
- **Body** (400, 13px, 1.4): the interface default. Notes and explanations open to 1.45–1.5; long sentences cap between 62ch (the plate question) and 90ch (the floor detail).
- **Label** (600, 12px): buttons, state words, chip counts, field labels.
- **Small** (400, 12px): times, freshness, census chips, secondary meta.
- **Caption** (600, 11px, 1.3): definition labels (Running for, Spent), table headers, the card number; sentence case.
- **Card title** (600, 13px, 1.18, width 84%): kanban and board card titles; clamped to three lines, two when held.
- **Card meta** (400, 11px, 1.3, width 84%): the card's top line (number, cost) and its one detail line.

### Named Rules
**The Narrow Stock Rule.** Card stock (the kanban card, the ask strip, the board card) is set at 84% width; everything printed on ink stays at normal width. Width is the only difference; never add a second family.

**The Tabular Clock Rule.** Tabular numerals everywhere. A card's time at this station and its run time sit right-aligned in the card's foot, against the slot edge; a slot too narrow for both keeps the station's time.

## Layout

A fixed shell, then a two-column floor. The top bar is 56px, sticky, on Night Floor with a hairline beneath: the mark and name, the live-link pill, then on the right Board, Logs, Costs and Product, the theme button and a 280px Find field with its shortcut. Under it the floor sentence row (16px top, 24px sides) carries the server's sentence at display size, the census chips, and freshness pushed to the right.

The floor grid is the cabinet in a flexible column and a 340px Needs you column, 22px apart, inside a 24px page gutter. The cabinet's grid is a 172px line column plus eight equal station columns. A row holding a card is at least 148px tall, an idle row 64px, the head 34px; every pigeonhole pads its content by 6px. A held line adds a second grid row under its stations for the plate or strip. Recently finished runs list below the cabinet as ruled rows, number, title, when, state and a right-aligned cost.

The line page reuses the same flexible-plus-340px grid: the live station panel and runs on the left, Tech lead and How this line runs on the right. The board scrolls horizontally through columns at least 178px wide with 10px gaps. The product room is three panes: 250px conversations, the conversation, a 400px product side.

The rhythm is literal pixels on a 2px grid: 6 inside pigeonholes, 10 between list items and board columns, 12–14 inside containers, 22 between the main columns, 24 for the page gutter. Density is high on purpose: 13px body, 30px buttons, one screen for the whole factory.

Responsive changes:
- **1180px:** floor and line grids stack to one column; Needs you moves above the cabinet.
- **1100px:** top-bar nav labels and the Find text become screen-reader-only; their icons remain.
- **900px:** the cabinet folds to one strip per line. The station head hides, empty and passed cells hide, the line's stations show as a row of 16×6px pips (green passed, gold here, red held, outlined ahead), the plate or strip runs full width without its notch, and a held card's own slot hides because the pips already say where it is.
- **760px:** line and product pages go single column; the station strip scrolls; the conversation list becomes one swipeable row.
- **700px:** the top bar compacts to a 12px gutter, the brand name hides and Find becomes a 36px icon button; board columns snap at 82vw. Usable from 320px.

## Elevation & Depth

The world is flat. Depth comes from the ink ladder (Night Floor behind, Cabinet Ink for fields, Raised Ink for overlays) and from hairline rules, not from shadows. Card stock carries only a one-pixel printed edge under it, the thickness of the card, not a lift. A real shadow appears only when something has left the field: the red plate turned over above its row, an overlay above the page, a board card being dragged, the log's jump-to-newest pill floating over the feed. When the plate holds focus the rest of the cabinet steps back (other rows to 42% opacity and 60% saturation) instead of the plate gaining a glow.

### Shadow Vocabulary
- **Card edge** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.25)`): under kanban cards and ask strips; the paper's edge.
- **Lift** (`box-shadow: 0 14px 30px -12px rgb(0 0 0 / 0.7), 0 4px 10px -4px rgb(0 0 0 / 0.5)`): the red plate at rest, the floating jump pill.
- **Pop** (`box-shadow: 0 24px 60px -18px rgb(0 0 0 / 0.75), 0 8px 18px -8px rgb(0 0 0 / 0.5)`): dialogs, drawers, the command palette, toasts, a dragged board card, and the plate while it holds focus (with a 2px cream ring at 40%).

The light theme softens Lift and Pop to ink at 18–32% (`--shadow-lift`, `--shadow-pop` in tokens.css).

### Named Rules
**The Flat Field Rule.** No gradients except the loading shimmer, no glows, no grain, no texture. Fields are single committed colours.

**The Lifted Only Rule.** A shadow means something has left the field: the plate, an overlay, a dragged card. Resting containers and resting cards never cast one.

## Shapes

Corners are tight and functional. Slots, card stock and the plate use a 3px corner; buttons, inputs and small controls 5px; the cabinet, panels, Needs you items, nav items and toasts 6px; dialogs and the palette 10px. Chips, tabs, the switch and pips round fully. Chat bubbles alone take a 12px corner with a 4px corner at the speaker's side.

The recurring silhouette is the printed card: cream stock with a solid band across its top edge, square at the top and rounded 3px at the bottom, so the band reads as print on the card rather than a border. The plate and the ask strip carry a 14×8px triangular notch on their top edge pointing up at the station slot the card is held in. Borders are one-pixel hairlines; solid means something is there, dashed means a slot with nothing in it.

### Named Rules
**The Printed Band Rule.** A printed top band belongs to cream card stock only: the kanban card 5px, the line page's current station 4px, the board card and the ask strip 3px. Its top corners are square (radius 0 0 r r). Ink containers (board columns, panels, Needs you items, requirement cards) carry no band.

**The Dashed Means Empty Rule.** A dashed edge marks an empty slot: an idle line, an empty board column, an honest empty note. Anything real, including an unread error, gets a solid edge.

## Components

### Buttons
Compact, typographic and colourless: the decision is filled in the text colour, everything else is an outline or bare text.
- **Shape:** gently squared (5px), 30px tall, 11px side padding; small size 26px with 9px padding; icon-only 32px square. 12px semibold label, 14px icon at a 6px gap.
- **Primary (decides):** filled in the text colour with ground-coloured text (cream fill on dark, ink fill on light).
- **Plain (redirects):** transparent with a Strong Rule outline and text-coloured label.
- **Quiet (ends or dismisses):** no border, Warm Grey label that brightens to the text colour on hover.
- **Hover / Focus:** a text-colour wash at 8% and a brighter border; primary softens to 86% toward the ground; pressing nudges the button down 1px; transitions run 140ms on the out-expo curve. Focus is a 2px Link Blue ring offset 2px. Busy swaps the icon for a 12px spinner and disables the button; disabled fades to 45%.
- **On the plate:** outlines in cream at 70%, primary filled cream with plate-red text, quiet underlined. **On card stock:** outlines in Black Print at 35%, primary filled Black Print with cream text, quiet in Stock Grey.
- **Confirm inline:** an ending action asks once more in place, never in a modal. On ink the armed button turns to a Signal Coral outline; on the plate it fills Brand Ink. It disarms itself after 4s. Armed is never gold.

### Chips
- **Style:** pill outline in Hairline, 26px tall, 12px Warm Grey text with the count in semibold Cream Print and a 7px state dot leading.
- **State:** census chips on the floor sentence (working in gold, needs you in coral); the Needs you count chip takes a coral-tinted outline when anything is waiting. Board labels on cream stock are pill tints of Black Print at 8%.

### Cards / Containers
- **Corner Style:** 6px for ink containers; 3px, square-topped, for card stock.
- **Background:** Cabinet Ink with a Hairline border for the cabinet, panels, board columns and Needs you items; Card Stock for anything that is a card.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** one-pixel Hairline; dashed Slot Edge for empty.
- **Internal Padding:** 12–14px for panels and items, 7–10px for card stock.

### Inputs / Fields
- **Style:** Night Floor fill (sitting back from the panel), one-pixel Strong Rule border, 5px corner, 8×10px padding, 13px text. Labels sit above at 12px semibold Warm Grey. Search and filter fields use Cabinet Ink with a Hairline border.
- **Focus:** the border gives way to a 2px Link Blue outline.
- **Error / Disabled:** refusals print as the server's sentence beneath; disabled controls fade.

### Navigation
- **Top bar links:** 13px medium Warm Grey with a 16px icon, 7×10px padding, 6px corner; hover brightens to the text colour on a 6% wash; the current page holds a 9% wash. Under 1100px only the icons show.
- **Tabs (board projects, cost views, product panes):** bare pills in Warm Grey; the selected tab fills in the text colour with ground-coloured text.
- **Command palette:** a 620px Raised Ink box at 14vh, 50px input row, 36px items whose selection is a 9% text wash.

### The Cabinet (signature)
One Cabinet Ink field with a 6px corner and a Hairline border, ruled into a grid: a 172px line column and eight station columns divided by hairlines. Its head row names the stations in 11px semibold capitals, tracked 0.06em, in Muted Pewter. These are the pigeonhole column headers, the only uppercase text in the system, and they belong to the cabinet alone. Each line's label cell holds the line name (14px semibold link), its state word (12px semibold; gold only while running, coral for warn and error, Pause Blue for clock, Warm Grey otherwise), where its card is, and the pickup switch at the foot. A passed station shows the 18px Tick Green circle top-left and its duration bottom-right; an empty station is a faint Slot Edge outline at 55%; a station a single-agent line skips shows an em dash; an idle line is one dashed slot across all eight columns with the server's clause in it.

### The Kanban Card (signature)
Cream stock with a 5px Kanban Gold band, sitting in the slot of the station it is at, set at 84% width. Top line: the card number (11px bold Stock Grey, a link) left, the cost right. Then the title (13px semibold, three lines), then one detail line: the newest log line, or, while validating, the gates passing in Printed Green with failures in plate red. The foot right-aligns the time at this station in semibold and the run's time after a slash in Stock Faint, with a 6px gold dot on the left that blinks every 1.6s while it works. Paused on a usage limit: band and dot turn Pause Blue and stop. Held: band and dot turn plate red, and the title clamps to two lines. When the server says it moved, the card travels to the next pigeonhole as one shared-layout spring (stiffness 420, damping 38).

### The Red Reversed Plate (signature)
The oldest ask's answer surface. It opens beneath the stations in its line's own row, spanning the eight station columns, so every tick and the held card stay in view; a 14×8px notch on its top edge points at the held card's slot. Reversed-Plate Red with cream text, 3px corner, 10×14px padding, Lift shadow. Top line at 12px: the kind of ask in bold, the card number and title, then held-at and waited-for in Plate Blush on the right. Then the question at title size (15px semibold, 62ch), the review verdict if any, and the answer row. It arrives by turning over from 70° on a spring. While it holds focus the rest of the cabinet steps back.

### The Ask Strip (signature)
Every ask that is not the oldest. One 44px line on cream stock with a 3px plate-red band, the same notch, the card-edge shadow, set narrow. The kind of ask in bold plate red, the question (or the review's warning, in plate red) truncated to one line, the wait in Stock Faint, then the answers in stock-coloured buttons. Under 900px it wraps to two lines.

### Station Marks
One mark per station state at every size. In the cabinet: green tick, faint slot, the card itself. In small: 16×6px pips. On the line page, eight equal station cells: passed cells show the tick on a Hairline outline, the current station is cream stock with a 4px gold band and a gold mark that beats, a held station fills plate red with a cream ring mark, stations ahead fade to 55%.

### Needs You Item
A Cabinet Ink item, no band, 6px corner, 12×14px padding: a coral dot, the line and card number, the kind of ask in Muted Pewter, the wait right-aligned; the card title in Warm Grey; the question at 14px; the review line (coral when it warns); then the same answer buttons as the plate, 8px below.

### Switch
32×18px pill on Raised Ink with a Strong Rule outline and a 12px thumb. Checked fills with the text colour and the thumb turns ground-coloured, sliding 14px over 220ms. Never gold.

### Overlays, Notes and Loading
- **Dialogs and drawers:** Raised Ink, Strong Rule border, Pop shadow; dialogs 460px wide with a 10px corner, rising 10px into place; drawers 560px from the right with a single left border. Scrim at 62% ink. 220ms.
- **Toasts:** bottom-right, 380px, Raised Ink, 6px corner, Pop shadow, icon in green for done and coral for refused (with a coral-tinted border).
- **Notes:** a sentence that stands where content would be. Empty: dashed Slot Edge, 6px corner, Warm Grey. Unread: solid coral outline at 45% on Alarm wash, announced as a status. Unread is never drawn as empty.
- **Skeletons:** shapes that match what will land, on a Raised Ink shimmer sweeping every 1.4s, the only gradient in the system.
- **Icons:** one drawn set on a 16px grid, 1.5px stroke, round caps and joins, inline SVG, decorative by default; the control carries the name.

### Named Rules
**The Three Tiers Rule.** Primary decides, plain redirects, quiet ends or dismisses. No fourth tier and no coloured buttons; an ask's answers keep these tiers on ink, on the plate and on stock.

**The Answer In Place Rule.** Answers are drawn on the ask itself (the plate, the strip, the Needs you item, the line page) with the same buttons in the same order; answering never opens another page.

## Do's and Don'ts

### Do:
- **Do** put each live card in the slot of the station it is at, as cream stock with a 5px gold band, number and cost on top, title, one detail line, and the station time and run time right-aligned in the foot.
- **Do** give the oldest ask the red plate and every other ask a strip; keep the held card in its own slot and open the ask beneath the stations with the notch pointing at it.
- **Do** use Reversed-Plate Red for red on cream and Signal Coral for red on ink.
- **Do** fill the checked switch, the selected tab and the primary button with the text colour (cream on dark, ink on light).
- **Do** draw unread as a sentence in a solid coral note and empty as a dashed slot with a sentence; never let one look like the other.
- **Do** keep tabular numerals and right-aligned times, and use the one 16px, 1.5px-stroke icon set inline.
- **Do** stop card travel, the plate's turn, the blinking dot and the shimmer under reduced motion.

### Don't:
- **Don't** use gold for anything but a moving card: not for warnings, selections, highlights, findings, chart strokes, chat tints or switch states.
- **Don't** put a second reversed plate on screen or reverse an ink container.
- **Don't** put a printed band on an ink container (board columns, panels, Needs you items, requirement cards), and don't round a band's top corners.
- **Don't** use gradients (the loading shimmer excepted), glows, grain or texture.
- **Don't** set uppercase letter-spaced eyebrows or kickers above headings; the cabinet's station header row is the one uppercase line and it stays in the cabinet.
- **Don't** fall back to a status table with pills and a separate inbox that sends the operator elsewhere to answer.
- **Don't** load fonts or icons from another host; Archivo Variable and the icon set are bundled.
