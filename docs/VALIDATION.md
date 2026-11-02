# Kiểm tra v0.1

- TypeScript strict: pass.
- 8 pricing tests: Happy Hour boundary, 70 minutes without block rounding, weekend, pause exclusion, tax/fee arithmetic, VIP, missing rate, invalid interval.
- 10 SQLite behavior tests against actual API statements: overlap, adjacency including cleanup, tenant scope, separate room, cancellation, paid cleanup, active overrun, future booking during active use, compare-and-swap repeat payment and 8 concurrent booking attempts with one winner.
- Mutation test removing weekend exclusion: pricing test failed as expected; original code restored and suite rerun.
- Supported Sites production build: pass.
- Browser: desktop room map, empty/error states and navigation inspected; preview has no injected visitor identity, so authenticated end-to-end path must be checked on private deployment.
- Mobile CSS: 2-column rooms, bottom nav, native dialogs and mobile forms implemented. Full physical-device/PWA, 3 locale and accessibility audits pending.

These checks cover an internal pilot, not readiness for real-money operation. Required production work remains in PROGRESS.md.
