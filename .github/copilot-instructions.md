# Golf3D project instructions
Read docs/REQUIREMENTS.md and docs/PROGRESS.md first. User decisions there override seed/reference websites. Keep pilot owner-private; do not imply this is production-ready.

Preserve Sites/Vinext build and authentication integration. No fake OTP, simulated payment success, invented API integration, or client-only business records. Never trust client tenant/user IDs, role flags, totals, prices or clocks. Scope every query by authenticated tenant and resource permissions. Current namespace is only a pilot, not finished multi-tenant RBAC.

Keep money integer VND and a server payment ledger; keep exact session intervals, exclude paused time, snapshot rates and policies. Price and fee changes must not silently reprice existing bookings. Use transactions/atomic guards and idempotency. Test races, retries, late arrivals, midnight, holiday and duplicate payments.

Implement thin complete slices with meaningful tests. Update PROGRESS truthfully after each slice, keeping unimplemented requirements listed. Do not delete tests, suppress type errors or loosen security to get a build. Mobile must work like an app, not a scaled desktop table. Customer and employee interfaces have distinct permissions.

Run TypeScript, tests and supported Sites build. Secrets only in platform environment; never in files/client. No publication audience change without user instruction. Don't recreate the registered Site; preserve .openai/hosting.json project_id.
