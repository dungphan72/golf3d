# Golf3D

**VS Code / Windows:** xem [hướng dẫn chạy local](docs/LOCAL_SETUP.md).

Private pilot for a golf facility: 10 open practice lines and 2 VIP rooms in Bình Trưng, TP.HCM. **Not production-ready for real customer billing yet.**

Read [requirements](docs/REQUIREMENTS.md), [progress and limitations](docs/PROGRESS.md), and [design](docs/DESIGN.md).

Current increment: **v0.2 — configurable tariff rules and pre-booking price breakdown**. See [progress](docs/PROGRESS.md).

## Runtime
Vinext/React/TypeScript, Cloudflare Workers + D1, owner-private Sites authentication. Source is synchronized to the Site's Git repository. Tenant scope currently corresponds to the authenticated private-site user; enterprise tenant membership, golfer OTP and RBAC are pending.

## Commands
- Install: `node /root/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/install-dependencies.mjs` inside the managed environment.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit`
- Pricing and booking tests: `pnpm test`
- SQLite behavior tests: `python tests/booking_sql_test.py`
- Build: supported Sites `scripts/build-site.mjs`; standalone `npm run build`.
- Preview: `sites-preview start /workspace/sites/golf3d`

Schema generation: `npm run db:generate`; commit generated migrations. Hosted migrations applied by Sites. Local migration after build:
```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amazing_dreadnoughts.sql
```
Apply once per local database. Do not replay or modify applied migrations. Local and hosted D1 are separate.

## Try the pilot
1. Open private Site using the owner's sign-in.
2. Settings: choose opening/closing hours, capacities, VAT/service fee. Unknown values deliberately remain empty. Do not infer a tax rate.
3. Review the tariff rules and set missing VIP/group prices and holding durations before booking those services. Declare holiday dates explicitly.
4. Create a test booking. Start is allowed at most 15 minutes before appointment.
5. Start, pause/resume, end, inspect the bill, and explicitly confirm the actual payment method. Send support requests from the session panel.
6. Settings snapshots keep existing session rates stable. Do not use the initial reference prices for real billing before full rate-policy implementation.

## Safety boundaries
No secrets in source. No mocked OTP or bank confirmations. No GC3 hardware calls. Browser print produces an internal receipt, not an electronic tax invoice. The customer-view toggle previews UX only; it grants no new identity. Domain golf3d.net has not been connected. No offline transactions; staff can use mobile 4G.
