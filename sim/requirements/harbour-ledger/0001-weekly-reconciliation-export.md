# REQ-0001 — Finance can download the week's reconciled lines

- **Status:** accepted
- **Asked by:** finance-lead
- **Date:** 2026-10-02
- **Supersedes:** —

## Why

The month-end close starts from a spreadsheet of every reconciled line. Today somebody copies it
out of the ledger screen by hand, one page at a time.

## What must be true

- [ ] a CSV export holds one row per reconciled line: date, account, amount, counterparty
- [ ] a week with nothing reconciled downloads a file with the header row only

## Out of scope

- exports in any format other than CSV

## Affects

- `src/ledger/export.py`

## Open questions

## Decisions taken during execution

| date | decision | who decided, and where |
|---|---|---|
