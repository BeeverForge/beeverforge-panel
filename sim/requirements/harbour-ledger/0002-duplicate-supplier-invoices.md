# REQ-0002 — A likely duplicate supplier invoice is flagged before it is paid

- **Status:** accepted
- **Asked by:** finance-lead
- **Date:** 2026-10-09
- **Supersedes:** —

## Why

In March one supplier invoice was paid twice. The same supplier and the same invoice number is the
strong signal; the amount alone is not.

## What must be true

- [ ] an invoice with the same supplier, number and amount as a booked one is flagged
- [ ] the clerk can dismiss the flag with a reason, and the dismissal is audited

## Out of scope

- matching invoices across different suppliers

## Affects

- `src/ledger/invoices.py`

## Open questions

## Decisions taken during execution

| date | decision | who decided, and where |
|---|---|---|
