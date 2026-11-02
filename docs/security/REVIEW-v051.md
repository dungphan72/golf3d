# Dependency security patch — v0.5.1

Review date: 2026-11-03. Owner-private pilot remains unchanged.

## Result

Native pnpm audit against the updated lockfile: **0 critical, 32 high, 31 moderate, 10 low**. Previous: 3 critical, 35 high, 36 moderate, 11 low. This resolves the recorded critical Next.js advisories but does not establish public/production readiness. Full remaining advisory list: dependency-audit-2026-11-03.json.

## Bounded change and rationale

- next and eslint-config-next: 16.3.4 → 16.4.1, the official October 14 security release. https://nextjs.org/blog/nextjs-security-update-october-14-2026
- miniflare>sharp override: 0.35.4 → 0.35.5 in package.json and pnpm-workspace.yaml; this removes the older vulnerable image library from the local Worker toolchain too.
- Generated lockfile changes are limited to these families: Next/@next, sharp/@img native variants and libvips; no change to Vinext, React, Vite, business logic, identity, sharing or database migrations.
- Existing registry integrity hashes and 7-day minimum-release-age remain enforced; target Next 16.4.1 was published October 14. No force remediation, advisory suppression or expanded script allowlist.
- Resolve used --lockfile-only --ignore-scripts; install used --frozen-lockfile --ignore-scripts. Installed new Next/sharp metadata contain no install/postinstall hooks; platform native modules arrive as registry artifacts. Existing build tools were retained.

## Verification and remaining limits

TypeScript strict, 125 regression tests (including real Wrangler SQL splitting) and production build pass. No migrations or stored records are altered. Browser preview can verify v0.5.1 shell and anonymous rejection only; authenticated business E2E remains pending. Existing owner-private sign-in gate remains enforced on hosted deployment.

32 high findings remain, including react-server-dom-webpack, Zod, Vite, undici and transitive build utilities. These require separate compatibility-tested increments, rather than broad forced overrides. Do not onboard real paying customers or claim the audit is clean. Next review target: 2026-11-09, before public release; no scheduled automation created.

Rollback: restore package.json, pnpm-workspace.yaml and pnpm-lock.yaml from v0.5, then perform frozen install and rebuild. This reintroduces the known critical advisories and is only an emergency compatibility rollback while remaining owner-private.

## Update v0.5.2

React/RSC have now moved to 19.2.9. Native high count is 31. The earlier zero-critical result was a scanner result only: the primary React RCE advisory was absent from that feed. See REVIEW-v052.md for source verification and transport regression coverage.
