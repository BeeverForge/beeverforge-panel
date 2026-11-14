# REQ-0003 — Nobody posts into a month finance has closed

- **Status:** proposed
- **Asked by:** controller
- **Date:** 2026-11-03
- **Supersedes:** —

## Why

Late postings into a closed month change figures that were already reported to the board.

## What must be true

- [ ] posting into a locked period is refused, naming the period
- [ ] only the controller role can unlock a period, and unlocking is audited

## Out of scope

- locking individual accounts

## Affects

- `src/ledger/periods.py`

## Open questions

- Should a correcting entry be allowed into a locked period with a second approval?

## Decisions taken during execution

| date | decision | who decided, and where |
|---|---|---|
