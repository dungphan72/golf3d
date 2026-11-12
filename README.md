# Golf3D

**VS Code / Windows:** xem [hướng dẫn chạy local](docs/LOCAL_SETUP.md).

Private pilot for a golf facility: 10 open practice lines and 2 VIP rooms in Bình Trưng, TP.HCM. **Not production-ready for real customer billing yet.**

Read [requirements](docs/REQUIREMENTS.md), [progress and limitations](docs/PROGRESS.md), and [design](docs/DESIGN.md). Staff: [hướng dẫn nhân viên](docs/HUONG-DAN-NHAN-VIEN.md).

Current implementation and remaining work: see [progress](docs/PROGRESS.md). This repository is a private pilot, not a production-ready billing system.

## Runtime
Vinext/React/TypeScript, Cloudflare Workers + D1, owner-private Sites authentication. Source is synchronized to the Site's Git repository. Tenant scope currently corresponds to the authenticated private-site user; enterprise tenant membership, golfer OTP and RBAC are pending.

## Commands
- Install: `pnpm install --frozen-lockfile` (Node.js and pnpm versions are in `package.json`).
- Typecheck: `pnpm typecheck`
- Unit, RSC, Worker runtime, and tooling tests: `pnpm test`
- SQLite/migration tests: run each `tests/*_test.py` with Python; on Windows set `$env:PYTHONUTF8='1'` first.
- Browser tests: `pnpm test:e2e` (install Chromium first with `pnpm exec playwright install chromium`).
- Lint: `pnpm lint`
- Supported Sites/Vinext build: `pnpm build`
- Schema generation: `pnpm db:generate`; commit new migrations. For local D1 setup and migration safety, follow [local setup](docs/LOCAL_SETUP.md).

## Try the pilot
1. Open private Site using the owner's sign-in.
2. Settings: choose opening/closing hours, capacities, VAT/service fee. Unknown values deliberately remain empty. Do not infer a tax rate.
3. Review the tariff rules and set missing VIP/group prices and holding durations before booking those services. Declare holiday dates explicitly.
4. Create a test booking. Start is allowed at most 15 minutes before appointment.
5. Open a shift with counted opening cash. Start, pause/resume, end, inspect the bill, then confirm the actual payment method. Reconcile and close through Ca & sổ tiền. See docs/FINANCE.md.
6. Settings snapshots keep existing session rates stable. Do not use the initial reference prices for real billing before full rate-policy implementation.

## Safety boundaries
No secrets in source. No mocked OTP or bank confirmations. No GC3 hardware calls. Browser print produces an internal receipt, not an electronic tax invoice. The customer-view toggle previews UX only; it grants no new identity. Domain golf3d.net has not been connected. No offline transactions; staff can use mobile 4G.

## Migration and production safety
The project has accumulated migrations beyond the early v0.3–v0.5 setup notes. Never replay old migrations or apply them to a live database based only on this README; use the current [local setup](docs/LOCAL_SETUP.md) and [progress](docs/PROGRESS.md), back up first, and verify the target environment. Do not change the registered Site, its authentication integration, or publication audience without explicit approval.
