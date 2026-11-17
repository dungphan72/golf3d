import { z } from 'zod';
import { db, audit, ok, fail, type ServiceResult } from './common';
import { normalizePhone, validPhone } from '../member';

/** News articles and events (tournaments) kept by the club and shown on the public site once published. */
export type Post = {
  id: string;
  kind: 'news' | 'event';
  title: string;
  summary: string;
  body: string;
  image: string;
  event_at: number | null;
  place: string;
  status: 'draft' | 'published';
  created: number;
  updated: number;
};

const COLUMNS = 'id,kind,title,summary,body,image,event_at,place,status,created,updated';

// Images are files this site stores (/img/...) or a plain https address; nothing else (no javascript: or data: URLs).
const imageRef = z
  .string()
  .max(300)
  .refine((v) => v === '' || /^\/img\/[\w./-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v), 'Địa chỉ ảnh không hợp lệ');

function sanitizePlace(place: string): string {
  return (place || '').replace(/Lượng\s*Định\s*Của/gi, 'Lương Định Của');
}

function cleanPost(p: Post): Post {
  return {
    ...p,
    place: sanitizePlace(p.place),
  };
}

export const postInput = z
  .object({
    id: z.string().max(100).optional(),
    kind: z.enum(['news', 'event']),
    title: z.string().trim().min(3, 'Tiêu đề từ 3 ký tự').max(140),
    summary: z.string().trim().max(300).default(''),
    body: z.string().max(8000).default(''),
    image: imageRef.default(''),
    eventAt: z.number().int().positive().nullable().default(null),
    place: z.string().trim().max(160).default('').transform(sanitizePlace),
    status: z.enum(['draft', 'published']).default('draft'),
  })
  .refine((v) => v.kind === 'news' || v.eventAt != null, {
    message: 'Sự kiện cần ngày giờ diễn ra',
    path: ['eventAt'],
  });
export type PostInput = z.infer<typeof postInput>;

export async function listAllPosts(tenant: string): Promise<Post[]> {
  const rows = await db()
    .prepare(`SELECT ${COLUMNS} FROM posts WHERE tenant=? ORDER BY created DESC LIMIT 200`)
    .bind(tenant)
    .all<Post>();
  return rows.results;
}

export async function savePost(tenant: string, raw: unknown, actor: string): Promise<ServiceResult> {
  const parsed = postInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' · '));
  const v = parsed.data;
  const now = Date.now();
  if (v.id) {
    const changed = await db()
      .prepare(
        'UPDATE posts SET kind=?,title=?,summary=?,body=?,image=?,event_at=?,place=?,status=?,updated=? WHERE tenant=? AND id=?',
      )
      .bind(v.kind, v.title, v.summary, v.body, v.image, v.kind === 'event' ? v.eventAt : null, v.place, v.status, now, tenant, v.id)
      .run();
    if (!changed.meta.changes) return fail('Không tìm thấy bài viết', 404);
    await audit(tenant, 'Nội dung', `Sửa ${v.kind === 'event' ? 'sự kiện' : 'tin'}: ${v.title}`);
    return ok({ id: v.id });
  }
  const id = crypto.randomUUID();
  await db()
    .prepare(
      'INSERT INTO posts(id,tenant,kind,title,summary,body,image,event_at,place,status,created,updated,actor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(id, tenant, v.kind, v.title, v.summary, v.body, v.image, v.kind === 'event' ? v.eventAt : null, v.place, v.status, now, now, actor)
    .run();
  await audit(tenant, 'Nội dung', `Thêm ${v.kind === 'event' ? 'sự kiện' : 'tin'}: ${v.title}`);
  return ok({ id });
}

export async function deletePost(tenant: string, id: string): Promise<ServiceResult> {
  const row = await db()
    .prepare('SELECT title FROM posts WHERE tenant=? AND id=?')
    .bind(tenant, id)
    .first<{ title: string }>();
  if (!row) return fail('Không tìm thấy bài viết', 404);
  await db().prepare('DELETE FROM posts WHERE tenant=? AND id=?').bind(tenant, id).run();
  await audit(tenant, 'Nội dung', `Xóa: ${row.title}`);
  return ok();
}

/** What the public site shows: published news (newest first), upcoming events (soonest first), and a few past events. */
export async function publicContent(tenant: string, now = Date.now()) {
  const [news, upcoming, past] = await Promise.all([
    db()
      .prepare(`SELECT ${COLUMNS} FROM posts WHERE tenant=? AND status='published' AND kind='news' ORDER BY created DESC LIMIT 12`)
      .bind(tenant)
      .all<Post>(),
    db()
      .prepare(`SELECT ${COLUMNS} FROM posts WHERE tenant=? AND status='published' AND kind='event' AND event_at>=? ORDER BY event_at LIMIT 6`)
      .bind(tenant, now)
      .all<Post>(),
    db()
      .prepare(`SELECT ${COLUMNS} FROM posts WHERE tenant=? AND status='published' AND kind='event' AND event_at<? ORDER BY event_at DESC LIMIT 6`)
      .bind(tenant, now)
      .all<Post>(),
  ]);
  return {
    news: news.results.map(cleanPost),
    upcoming: upcoming.results.map(cleanPost),
    past: past.results.map(cleanPost),
  };
}

export async function publicPost(tenant: string, id: string): Promise<Post | null> {
  const row = await db()
    .prepare(`SELECT ${COLUMNS} FROM posts WHERE tenant=? AND id=? AND status='published'`)
    .bind(tenant, id)
    .first<Post>();
  return row ? cleanPost(row) : null;
}

export type Signup = { id: string; post_id: string; name: string; phone: string; note: string; created: number };

export const signupInput = z.object({
  postId: z.string().min(8).max(100),
  name: z.string().trim().min(2, 'Hãy nhập họ tên').max(100),
  phone: z.string().trim().min(8, 'Số điện thoại chưa đúng').max(20),
  note: z.string().trim().max(200).default(''),
  website: z.string().max(0).default(''), // honeypot: people leave it empty
});

/** A guest signs up for a published event that has not started yet. One signup per phone number. */
export async function signUpForEvent(tenant: string, raw: unknown, now = Date.now()): Promise<ServiceResult> {
  const parsed = signupInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(' · '));
  const v = parsed.data;
  const phone = normalizePhone(v.phone);
  if (!validPhone(phone)) return fail('Số điện thoại chưa đúng');
  const event = await db()
    .prepare("SELECT id,title,event_at FROM posts WHERE tenant=? AND id=? AND kind='event' AND status='published'")
    .bind(tenant, v.postId)
    .first<{ id: string; title: string; event_at: number }>();
  if (!event) return fail('Không tìm thấy sự kiện', 404);
  if (event.event_at < now) return fail('Sự kiện này đã diễn ra', 409);
  const exists = await db()
    .prepare('SELECT 1 AS x FROM event_signups WHERE tenant=? AND post_id=? AND phone=?')
    .bind(tenant, v.postId, phone)
    .first();
  if (exists) return ok({ already: true });
  await db()
    .prepare('INSERT INTO event_signups(id,tenant,post_id,name,phone,note,created) VALUES (?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), tenant, v.postId, v.name, phone, v.note, now)
    .run();
  await audit(tenant, 'Đăng ký sự kiện', `${v.name} (${phone}) · ${event.title}`);
  return ok({ already: false });
}

export async function listSignups(tenant: string, postId: string): Promise<Signup[]> {
  const rows = await db()
    .prepare('SELECT id,post_id,name,phone,note,created FROM event_signups WHERE tenant=? AND post_id=? ORDER BY created')
    .bind(tenant, postId)
    .all<Signup>();
  return rows.results;
}

export async function signupCounts(tenant: string): Promise<Record<string, number>> {
  const rows = await db()
    .prepare('SELECT post_id,COUNT(*) AS n FROM event_signups WHERE tenant=? GROUP BY post_id')
    .bind(tenant)
    .all<{ post_id: string; n: number }>();
  return Object.fromEntries(rows.results.map((r) => [r.post_id, r.n]));
}
