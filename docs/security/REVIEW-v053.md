# Worker network dependency patch — v0.5.3

Reviewed 2026-11-03. Owner-private pilot remains unchanged.

## Scope and evidence

Miniflare pins undici 7.24.8 exactly. Scoped `miniflare>undici: 7.30.1` overrides that pin in both package.json and pnpm-workspace.yaml. It stays within major 7, but the parent exact pin makes this a compatibility risk requiring a Worker/D1 runtime smoke test. No other package family changes. Node >=20.18.1 is required by undici; the project minimum >=22.13 satisfies it.

Official release: https://github.com/nodejs/undici/releases/tag/v7.30.1 (October 15). Fixes include TLS option preservation, redirect/cache isolation and handling of hostile encoding/renegotiation errors. Installed metadata confirms Miniflare resolves 7.30.1. The application hosted on Workers uses the platform fetch; this patch concerns installed local/build tooling, not a replacement of Cloudflare's built-in network stack.

Native audit: **0 critical, 21 high, 17 moderate, 5 low**, down from v0.5.2's 0/31/31/10. No remaining undici advisories in the current native report. Scanner limitations from REVIEW-v052 still apply.

## Supply chain and checks

Lock resolution and frozen install use --ignore-scripts. The package declares a prepare command; it was not executed. No new allowed build scripts, no minimum-release-age exceptions, no forced bulk remediation. Lockfile retains registry integrity hashes and changes only undici's package version plus the scoped override.

127 tests pass: previous 126 plus real Miniflare/Workerd HTTP request/response and D1 binding smoke coverage. JSON POST round-trip includes Vietnamese text and monetary integer; no external destination or live business data used. Strict TypeScript and production build pass. No schema/data/authentication/sharing changes. Authenticated business E2E remains pending.

21 high findings remain including Zod, Vite, ws and build utilities. Continue owner-private test usage. Production/public readiness remains blocked by reachable security findings, staff/tenant authorization and remaining acceptance work. Next dependency review target: November 9 or before public release; no reminder created.

Rollback: remove only the scoped undici override from both manifests, restore the matching v0.5.2 lockfile, frozen install and rebuild. That reinstalls known vulnerable 7.24.8, so only use for emergency compatibility recovery while owner-private.
