import { NextRequest } from 'next/server';
import { authorize, httpError, sameOrigin } from '../../auth-session';
import { db, audit, loadConfig } from '../../../lib/server/common';
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from '../../../lib/landing-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Find active tenant or first tenant
    const row =
      (await db()
        .prepare("SELECT tenant, value FROM settings WHERE json_extract(value,'$.onlineEnabled')=1 LIMIT 1")
        .first<{ tenant: string; value: string }>()) ??
      (await db().prepare('SELECT tenant, value FROM settings LIMIT 1').first<{ tenant: string; value: string }>());

    if (!row) {
      return Response.json({
        ok: true,
        data: DEFAULT_LANDING_CONFIG,
      });
    }

    const val = JSON.parse(row.value || '{}');
    const landing = val.landing || {};

    const merged: LandingConfig = {
      ...DEFAULT_LANDING_CONFIG,
      ...landing,
      // Ensure arrays fallback to default if empty
      galleryPhotos: landing.galleryPhotos?.length ? landing.galleryPhotos : DEFAULT_LANDING_CONFIG.galleryPhotos,
      amenities: landing.amenities?.length ? landing.amenities : DEFAULT_LANDING_CONFIG.amenities,
      testimonials: landing.testimonials?.length ? landing.testimonials : DEFAULT_LANDING_CONFIG.testimonials,
      standardHighlights: landing.standardHighlights?.length ? landing.standardHighlights : DEFAULT_LANDING_CONFIG.standardHighlights,
      vipHighlights: landing.vipHighlights?.length ? landing.vipHighlights : DEFAULT_LANDING_CONFIG.vipHighlights,
    };

    return Response.json({
      ok: true,
      tenant: row.tenant,
      data: merged,
    });
  } catch (err) {
    console.error('GET /api/landing error:', err);
    return Response.json({
      ok: true,
      data: DEFAULT_LANDING_CONFIG,
    });
  }
}

export async function POST(req: NextRequest) {
  // Read the body before any early reply: an unread body upsets the worker runtime.
  const text = await req.text().catch(() => '');
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;

  try {
    if (text.length > 200_000) return httpError('Nội dung quá lớn', 413);
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return httpError('Dữ liệu không hợp lệ', 400);
    }

    const d = db();
    const tenant = auth.tenant;

    // Check if settings record exists for tenant
    const existing = await d
      .prepare('SELECT value FROM settings WHERE tenant=?')
      .bind(tenant)
      .first<{ value: string }>();

    if (!existing) {
      const initVal = { landing: raw };
      await d
        .prepare('INSERT INTO settings (tenant, value) VALUES (?, ?)')
        .bind(tenant, JSON.stringify(initVal))
        .run();
    } else {
      const r = await d
        .prepare("UPDATE settings SET value = json_set(value, '$.landing', json(?)) WHERE tenant = ?")
        .bind(JSON.stringify(raw), tenant)
        .run();

      if (!r.meta.changes) {
        // Fallback in case value is not JSON or json_set failed
        const parsed = JSON.parse(existing.value || '{}');
        parsed.landing = raw;
        await d
          .prepare('UPDATE settings SET value = ? WHERE tenant = ?')
          .bind(JSON.stringify(parsed), tenant)
          .run();
      }
    }

    await audit(tenant, 'Landing Page', 'Cập nhật nội dung và giao diện Landing Page');

    return Response.json({
      ok: true,
      message: 'Đã lưu cấu hình Landing Page thành công',
    });
  } catch (err) {
    console.error('POST /api/landing error:', err);
    return httpError('Không thể lưu cấu hình. Vui lòng thử lại.', 500);
  }
}
