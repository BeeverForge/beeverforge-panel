# REQ-0004 — The aged-debt report groups invoices into four age buckets

- **Status:** observed
- **Asked by:** unrecorded
- **Date:** 2026-10-20
- **Supersedes:** —
- **Evidence:** code — the code does this and nothing asserts it — treat as possibly accidental
- **Observed at commit:** `unrecorded`

> **This is not a commitment.** It describes what the system does today. Until somebody confirms it is intended — by changing the status to `accepted` — the factory must not defend it, because a bug read off the code looks exactly like a feature.

## Why

Unknown: nobody asked for this — it was reverse-engineered from the code, and no request for it was found.

## What must be true

- [ ] open invoices are grouped as 0–30, 31–60, 61–90 and over 90 days

## Out of scope

- (not determined by a reverse-engineering pass)

## Affects

- `src/ledger/reports/aged_debt.py`

## Open questions

## Decisions taken during execution

| date | decision | who decided, and where |
|---|---|---|
