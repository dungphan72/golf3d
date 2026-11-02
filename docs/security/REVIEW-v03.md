# Security review — private pilot v0.3

Review date: 2026-11-02. Next dependency review target: 2026-11-09, before any public access (no automated task created).

## Trust boundaries and controls
- Browser input is untrusted. Finance POST uses a strict allowlist, a 5 KB request cap, integer VND and enum/length validation. Tenant, actor, invoice total and timestamps come from authenticated server state.
- Sites owner-private authentication remains unchanged. Every finance read/write includes the authenticated tenant. This is not finished organization/staff RBAC, and must not be opened to employees/other owners yet.
- Cross-origin POST rejected. No wildcard CORS, new credentials, new integrations, external transfers or card information introduced.
- Cash entries are append-only. SQLite triggers atomically write the receipt, update invoice/shift and audit; failure rolls back the complete statement.
- One open shift per tenant, one receipt per booking and one request key per tenant. Replayed keys must match original content. Shift-open IDs derive from tenant + retry key to avoid cross-tenant collisions.
- Drawer withdrawals cannot exceed recorded available cash. Closing requires the latest ledger version and a reason for differences; closed shifts are immutable.
- Payment methods and amounts are bookkeeping records, not execution of bank/card transactions. No card PAN, bank account, credential, or customer phone is copied into the new journal. Free-text reasons remain private.
- Financial logs require an append-only reversal/approval design before corrections/refunds can be offered; no mutation/delete shortcut added.

## Native dependency audit — NOT clean
The existing starter lockfile reports **3 critical, 35 high, 36 moderate, 11 low** findings. No dependency versions were changed in this feature. Details and primary advisory URLs are in dependency-audit-2026-11-02.json. This audit result is a blocker for declaring production/public readiness, not a green check.

Triage and temporary mitigation:
- Next critical findings concern `next/og`, SVG image optimization and typed arrays in `use cache`. Application source does not use `ImageResponse`/`next/og`, `use cache` or Server Actions. The runtime is Vinext/Workers, whose image adapter rejects SVG unless `dangerouslyAllowSVG` is enabled (it is not enabled here). This is reachability evidence, not a proof that all framework attack paths are unreachable.
- RSC and Vite findings affect installed build/dev dependencies. RSC build/runtime paths need compatibility review, and Windows dev-server advisories matter to the user's local setup. Keep local preview on loopback and never expose a development server publicly.
- Zod collection-exhaustion finding is mitigated on new finance endpoints by scalar-only strict objects and a 5 KB cap; the older config endpoint has a 100 KB cap. This does not replace a library fix.
- Other high findings include undici, sharp, js-yaml, brace-expansion, browserslist, image-size and source-map-js. Runtime/build reachability has not been fully audited. Do not claim these are resolved or harmless solely because a package is marked dev.
- Keep this Site owner-private, use test data and do not onboard real paying facilities. Before public/production release, review official advisories, update compatible packages in isolated changes, preserve the lockfile/script policy, rerun audit and regression/browser checks, and resolve reachable high/critical findings. Do not force-upgrade the entire stack or suppress advisories.

## Remaining release blockers
Full OTP/organization RBAC, financial adjustment approval and refund ledger, split tenders, backup/restore exercise, retention/access controls, real-device/browser E2E and the dependency findings above remain open.

## v0.4 incremental review
Native audit rerun with unchanged dependencies returned the same counts. F&B POST is capped at 16 KB, strict schemas reject client totals/tenant, carts have at most 10 unique products, and server/D1 both check current item version and monetary snapshots. Customer QR access is intentionally not introduced before session authorization. Financial payment requests additionally compare expectedAmount with the server total. No bank/card transfers or new external services are executed.

### v0.5 incremental review

Không thêm dependency. API stock xác thực owner và tenant server-side, kiểm tra origin, giới hạn body, strict Zod; SQL prepared. Ledger bất biến, manual retry signature, internal sale key tách namespace. SQLite triggers bảo vệ reserved units và rollback stock/bill/status khi audit lỗi. UI không hiển thị tồn 0 giả khi chưa cấu hình. Chưa có RBAC/OTP và chưa nghiệm thu authenticated E2E. Các cảnh báo dependency đã ghi phía trên vẫn là giới hạn trước khi vận hành thật.

## Superseded dependency status — v0.5.1

The historical counts above describe the old v0.3–v0.5 lockfile. The current v0.5.1 audit is **0 critical, 32 high, 31 moderate, 10 low**. See REVIEW-v051.md and dependency-audit-2026-11-03.json for the bounded upgrade and remaining release blockers.
