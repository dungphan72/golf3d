import { sendResult, httpError, originOf, requestNow, clientIp } from '../../../../lib/server/http';
import { overLimit } from '../../../../lib/server/throttle';
import { intakeInput } from '../../../../modules/crm/server/inputs';
import { ingestLead } from '../../../../modules/crm/server/leads';
import { db } from '../../../../lib/server/common';
export const dynamic = 'force-dynamic';

/** Public inquiry form. Rate limited per address; needs the consent box; a filled honeypot is ignored. */
export async function POST(req: Request) {
  const raw = await req.text().catch(() => '');
  if (raw.length > 6000) return httpError('Yêu cầu quá lớn', 413);
  if (await overLimit('crm2_intake', clientIp(req), 10 * 60_000, 10))
    return httpError('Quá nhiều yêu cầu, thử lại sau ít phút', 429);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = intakeInput.safeParse(json);
  if (!parsed.success)
    return httpError('Vui lòng nhập họ tên, số điện thoại và đồng ý để chúng tôi liên hệ');
  const tenant = (
    await db()
      .prepare("SELECT tenant FROM memberships WHERE role='owner' ORDER BY rowid LIMIT 1")
      .first<{ tenant: string }>()
  )?.tenant;
  if (!tenant) return httpError('Chưa sẵn sàng nhận yêu cầu', 503);
  const { consent, website, ...lead } = parsed.data;
  void consent;
  void website;
  const r = await ingestLead(
    tenant,
    { ...lead, source: 'Website' },
    originOf(req),
    requestNow(req),
  );
  // The visitor learns nothing about duplicates or blocked numbers.
  return sendResult({ status: r.status, body: r.status === 200 ? { ok: true } : r.body });
}
