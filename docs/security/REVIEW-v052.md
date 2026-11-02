# React Server Components patch — v0.5.2

Reviewed 2026-11-03. Owner-private pilot only.

## Change

React, react-dom and react-server-dom-webpack move together from 19.2.6 to 19.2.9. The RSC package explicitly requires matching React and DOM ^19.2.9. Only these three package versions change; the large lockfile diff reflects React peer-dependency identifiers throughout the existing tree. No scripts, framework, authentication or database changes; existing install policies remain enforced.

Primary source: https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3 identifies 19.2.9 as patched against a typed-array transport RCE issue. Release: https://github.com/react/react/releases/tag/v19.2.9 (October 14). 19.2.8 only addresses the earlier DoS advisory; stopping there would be insufficient.

Native audit reports **0 critical, 31 high, 31 moderate, 10 low** (v0.5.1: 0/32/31/10). The audit feed did not list the primary RCE advisory above for the old standalone RSC package; zero critical in the prior report was therefore only the native scanner's result, not proof of no known critical exposure. Primary advisories must remain part of review.

## Verification

- Lock resolution and frozen installation used --ignore-scripts. All three installed package manifests have no install/postinstall hooks. No expanded allowBuilds or age exceptions; targets published October 14.
- Actual React Flight server/client round-trip checks nested booking values, Vietnamese text and two different typed arrays. This verifies transport compatibility, not exploit prevention or a security proof.
- 126 tests pass: previous 125 plus the Flight test. Strict TypeScript and Worker production build pass.
- Existing owner-only sign-in gate preserved. Authenticated business-flow E2E remains pending; preview can only verify the anonymous shell/error.

31 high findings remain (including Zod, Vite, undici and build utilities). No public/paid onboarding until reachable findings and identity/RBAC gaps are addressed. Next dependency review target remains November 9 or before public release, whichever is earlier; no reminder created.

Rollback requires restoring the three React pins and authoritative lockfile, frozen installation and rebuilding. That would reintroduce known RSC vulnerabilities; use only for an emergency compatibility recovery while owner-private.
