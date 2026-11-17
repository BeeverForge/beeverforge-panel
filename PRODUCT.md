# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, TypeScript, Vite; TanStack Query and Router; Radix primitives. Decided in ADR-0059; built only on BeeverForge's public front-end API (`docs/reference/the-front-end-api.md`).

## Users

**Primary: the operator.** Keeps the panel open all day, often on a second screen beside their own work. Glances at it to know whether the factory is moving, and acts when it needs them: merge or send back a pull request, answer a parked decision, resume or skip a held card, approve a production release. When the operator and another user's needs conflict, the operator wins.

**Secondary: the product owner (client).** Non-technical. Talks to the product role in plain language, checks requirements, and confirms whether what they asked for shipped. Never needs delivery jargon.

**Also: the evaluator.** Somebody deciding whether to adopt BeeverForge looks at the panel to understand what the factory does. They should grasp it without a tour.

## Product Purpose

BeeverForge is an autonomous software factory: a ticket dropped on a board is picked up, implemented by a coding agent in a throwaway box, validated by the project's own gates, independently reviewed, opened as a pull request and merged, and its deploy is watched. Policies approve actions; a person judges the result. The panel is the reference surface where that happens in view (ADR-0038).

The panel is rebuilt in React, in a repository of its own, to replace the single-file page the core still serves (`beeverforge/api/panel.html`; the core's ADR-0059). It succeeds when, side by side on the same live floor, it is clearly better at four things the user named:

1. **Feels alive in real time:** stations advance, logs stream and counts change the moment the server says so.
2. **Answer what needs me fastest:** merge, decide, resume or skip in one place, with the least clicking and reading.
3. **Never blank, never janky:** an instant shell, loading shapes that match the content, no layout jumps, honest stale and offline states.
4. **Understandable to a newcomer:** an evaluator can tell what the factory is doing without explanation.

## Positioning

The control model is inverted: interactive AI coding asks a person to approve every action; BeeverForge lets policies approve actions and asks a person only to judge results and answer what the machine cannot. The panel is where that inversion is visible: the machine works, and the screen tells you only when and where it needs you.

## Operating Context

- One deployment hosts several projects. Each project is one production line ("floor") that runs **one job at a time**; a parked job holds its floor until somebody answers it (single-line strict, ADR-0010).
- A job walks stations in order: sizing, spec check, prepare, plan (two-stage projects only), code, validate (the project's own gates), review, pull request, then merge (by policy or by a person), and optionally a production approval and deploy watch.
- What needs a person: a parked decision with options, a pull request at the human merge gate (merge / re-review / adjust / address comments / discard), a held card (resume / skip), a usage-limit pause (retry now / skip), a production release approval, a wedged job (stop).
- Live data arrives over two SSE streams and two WebSockets; the server computes every verdict (the floor sentence, what needs you, which buttons exist). The front end renders server sentences and derives nothing it could get wrong.
- Deployments run on private client networks, behind loopback by default.

## Capabilities and Constraints

- Built only on the public API contract; `/api/v1/` reads where they exist.
- **Zero outbound requests:** nothing is loaded from another host. Fonts and icons may be bundled inside the build and served by the deployment itself (confirmed by the user).
- Unread is never empty: a read that failed (`null`) and a read that found nothing (`[]`) are always different states with different sentences.
- Every action names what it does; refusals are shown in the server's own sentence.
- Dark theme by default, plus a light theme; `prefers-color-scheme` is deliberately not the default (the product owner chose the dark control room).
- The panel asks nothing of the core beyond its public contract. A word or a read it needs that the core does not publish yet is added in the core, as a contract any front end may read, and never copied here.

## Brand Commitments

- Name: BeeverForge (served name is configurable per deployment).
- The beaver mark (inline SVG): cream strokes on the brand ink badge, its tail in the brand gold.
- Brand kit: ink `#1F1F24`, cream `#FAF9F6`, gold `#D4A24C`.
- Colour is semantic on the floor: running, done, failed, link. It never decorates.
- Voice: plain, precise sentences that state cause and remedy. No exclamation, no apology, no jargon for the product owner.

## Evidence on Hand

- Synthetic projects and cards for the rig and the simulator (`sim/fixtures.ts`), labelled synthetic; no customer data.
- No testimonials, metrics, or customer names exist for this panel; none may be invented.

## Product Principles

1. **The machine works, the screen asks.** Quiet when the factory moves; unmistakable when it needs a person, and the answer is one action away.
2. **Say only what the server said.** Verdicts, sentences and available actions come from the API; the screen never guesses.
3. **Honest about what it cannot see.** Stale, unread, offline and reconnecting are shown as themselves, never as calm.
4. **Every line visible at once.** The whole factory reads at a glance before any drill-down.

## Accessibility & Inclusion

WCAG 2.2 AA. Keyboard reachable throughout, visible focus, live regions for status changes and toasts, reduced motion respected, usable at phone widths from 320 px.
