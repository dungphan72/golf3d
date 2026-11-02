# Changelog

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
