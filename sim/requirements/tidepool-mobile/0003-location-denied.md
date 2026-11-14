# REQ-0003 — The map still opens when a visitor denies location

- **Status:** observed
- **Asked by:** unrecorded
- **Date:** 2026-10-30
- **Supersedes:** —
- **Evidence:** tested — a test asserts this, so somebody made it a promise on purpose
- **Observed at commit:** `unrecorded`

> **This is not a commitment.** It describes what the system does today. Until somebody confirms it is intended — by changing the status to `accepted` — the factory must not defend it, because a bug read off the code looks exactly like a feature.

## Why

No request for this was found, but a test asserts it: somebody made it a promise on purpose.

## What must be true

- [ ] denying location shows the map without the visitor's position

## Out of scope

- (not determined by a reverse-engineering pass)

## Affects

- `app/src/test/kotlin/reef/LocationDeniedTest.kt`

## Open questions

## Decisions taken during execution

| date | decision | who decided, and where |
|---|---|---|
