# Tooling parsers patch — v0.5.4

Reviewed 2026-11-03. Owner-private pilot retained.

Scoped overrides preserve major-version contracts: brace-expansion 1.1.14 → 1.1.20, brace-expansion 5.0.6 → 5.0.11 and js-yaml 4.1.1 → 4.3.2. Lockfile diff contains only these three package records and references; no broader resolver updates. package.json and pnpm-workspace.yaml agree. No authentication, data, schema, or access changes.

Sources: https://github.com/advisories/GHSA-qhr7-859c-m2p7 (brace nesting stack exhaustion; fixes 1.1.20/5.0.11) and https://github.com/advisories/GHSA-2883-xcg3-v3hh (YAML empty merge sources bypass resource budget; fix 4.3.2). Both advisories link the maintainers' repositories and fixes.

Native audit: **0 critical, 8 high, 16 moderate, 5 low**, previously 0/21/17/5. Full current list in dependency-audit-v054.json; no scanner result is a proof of absence of vulnerabilities.

Resolve and frozen install ran with --ignore-scripts. Existing 7-day release age, integrity hashes and allowBuilds policy remain unchanged. No advisory exclusions or added lifecycle permissions. An initial frozen install was correctly refused while resolution was incomplete; after lock generation finished, frozen installation succeeded.

130 tests pass (previous 127 + 3 tooling tests). New tests exercise both installed brace majors with normal filename expansion and bounded 4,000-level nesting, plus ESLint's actual YAML dependency with valid config and an empty-source merge budget. Strict typecheck and Worker production build pass. Test fixtures use no live data or external service.

Remaining high findings concern ws, browserslist, image-size, source-map-js, Vite and Zod. Zod needs a major-version compatibility review; avoid blanket forced overrides. Authenticated business E2E and staff/organization RBAC remain unresolved. Keep owner-private test usage; next review target November 9 or before public release, whichever is earlier (no reminder created).

Rollback: restore the three override entries and lockfile from v0.5.3, frozen install and rebuild. This reintroduces the documented parser vulnerabilities and is only an emergency compatibility recovery while owner-private.
