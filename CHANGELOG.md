# Changelog

## 0.4.0 — 2026-11-02
- Add configurable food/drink menu with explicit item VAT and service fees, archived availability and versioned prices.
- Create orders from playing sessions; process kitchen/bar states and reasoned cancellation before serving.
- Charge served orders once and include item details in combined receipts, with separate F&B taxes/fees.
- Block payment for unserved orders and require cashier confirmation of the currently reviewed total.
- Add migration 0002 without rewriting existing migrations; cover tenant scope, races, stale prices, audit rollback and snapshot immutability.
- Retain private-pilot status and unresolved dependency-audit release blockers.

## 0.3.0 — 2026-11-02
- Add opening float, cash movements, cash/card/transfer reconciliation and locked shift closing.
- Route new receipts through a tenant-scoped append-only journal; atomically update invoice, shift version and audit.
- Prevent duplicate receipts, negative cash balances, edits to paid totals and stale shift closes.
- Keep old paid receipts unchanged; dashboard new receipts follow actual recording time.
- Add migration 0001, financial input tests and SQLite concurrency/rollback tests.
- Record unresolved starter dependency advisories; retain private-pilot status.

## 0.2.0 — 2026-11-02
- Add configurable tariffs by room type, service, day type, time window and group size.
- Show estimated service, fee, VAT and total before booking; reject stale displayed prices.
- Lock round prices to booked start and preserve historical booking snapshots.
- Add fixed or percentage fee with service scope; precise row rounding.
- Guard concurrent settings updates and reject overlapping or invalid tariffs.
- Record end time even when a session overruns into an unpriced period; block payment/receipt until reviewed.
- Retain private-pilot access and existing data; no database migration in this version.

## 0.1.0 — 2026-11-02
- Initial private room map, booking, session timer, receipts and basic support requests.
