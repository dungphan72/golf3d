import { db, type ServiceResult } from './common';
import { coachingInput, type CoachingInput } from '../coaching';
import { normalizePhone, validPhone } from '../member';
import { can, type Role } from '../auth/permissions';
import { scopedShiftId } from '../finance';
import {
  CREATE_COACH_SQL,
  UPDATE_COACH_SQL,
  CREATE_LESSON_SQL,
  RESCHEDULE_LESSON_SQL,
  SET_LESSON_STATUS_SQL,
  NOTE_LESSON_SQL,
  LIST_COACHES_SQL,
  LIST_LESSONS_SQL,
} from '../coaching-sql';

export { coachingInput };
export type Actor = { userId: string; tenant: string; role: Role };
type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);
const DAY = 86_400_000;

function explain(e: unknown): R {
  const message = e instanceof Error ? e.message : String(e);
  const table: [string, string, number][] = [
    ['COACH_BUSY', 'HLV đã có buổi học trong khung giờ này', 409],
    ['COACH_NOT_FOUND', 'Không tìm thấy HLV hoặc HLV đã ngừng hoạt động', 404],
    ['COACH_USER_INVALID', 'Tài khoản liên kết phải là nhân viên có vai trò HLV', 400],
    ['INVALID_COACH', 'Thông tin HLV không hợp lệ', 400],
    [
      'INVALID_LESSON',
      'Thông tin buổi học không hợp lệ (thời lượng 15–480 phút, bội số của 15)',
      400,
    ],
    ['LESSON_CLOSED', 'Buổi học đã đóng nên không sửa được', 409],
    ['INVALID_LESSON_STATE', 'Buổi học đã được xử lý trước đó', 409],
    ['lesson_request_once', 'Mã yêu cầu đã dùng cho thao tác khác', 409],
  ];
  for (const [needle, text, status] of table)
    if (message.includes(needle)) return error(text, status);
  console.error('coaching operation', e);
  return error('Chưa xác minh được kết quả. Tải lại trước khi thử tiếp.', 500);
}

async function myCoachId(actor: Actor) {
  const row = await db()
    .prepare('SELECT id FROM coaches WHERE tenant=? AND user_id=?')
    .bind(actor.tenant, actor.userId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/** HLV accounts only ever see their own lessons; everyone else sees the whole schedule. */
export async function loadCoaching(actor: Actor, from: number, to: number, coachId: string) {
  try {
    const own = actor.role === 'coach' ? await myCoachId(actor) : null;
    if (actor.role === 'coach' && !own) return reply({ coaches: [], lessons: [], me: null });
    const filter = own ?? coachId;
    const coaches = (await db().prepare(LIST_COACHES_SQL).bind(actor.tenant).all()).results;
    const lessons = (
      await db()
        .prepare(LIST_LESSONS_SQL)
        .bind(actor.tenant, from, Math.min(to, from + 62 * DAY), filter, filter)
        .all()
    ).results;
    return reply({
      coaches: own ? coaches.filter((c) => c.id === own) : coaches,
      lessons,
      me: own,
    });
  } catch (e) {
    console.error('coaching load', e);
    return error('Chưa tải được lịch dạy. Kiểm tra migration 0007.', 503);
  }
}

export async function applyCoaching(actor: Actor, input: CoachingInput): Promise<R> {
  const d = db();
  const now = Date.now();
  const tenant = actor.tenant;
  try {
    if (input.action === 'coach-save') {
      if (!can(actor.role, 'coach.manage')) return error('Bạn không có quyền quản lý HLV', 403);
      if (input.id) {
        const r = await d
          .prepare(UPDATE_COACH_SQL)
          .bind(input.name, input.phone, input.userId, input.active ? 1 : 0, tenant, input.id)
          .run();
        return r.meta.changes ? reply({ ok: true }) : error('Không tìm thấy HLV', 404);
      }
      const id = crypto.randomUUID();
      await d
        .prepare(CREATE_COACH_SQL)
        .bind(id, tenant, input.userId, input.name, input.phone, input.active ? 1 : 0, now)
        .run();
      return reply({ ok: true, id });
    }
    if (input.action === 'lesson-create') {
      if (!can(actor.role, 'coach.schedule')) return error('Bạn không có quyền xếp lịch học', 403);
      const phone = normalizePhone(input.phone);
      if (!validPhone(phone)) return error('Số điện thoại không hợp lệ');
      if (input.start % 900_000 !== 0) return error('Giờ bắt đầu phải cách nhau 15 phút');
      if (input.start < now) return error('Giờ bắt đầu phải ở tương lai');
      if (input.start > now + 365 * DAY) return error('Chỉ xếp lịch trong vòng 12 tháng');
      const id = await scopedShiftId(tenant, 'lesson-' + input.requestId);
      const dupe = await d
        .prepare('SELECT coach_id,start FROM lessons WHERE tenant=? AND id=?')
        .bind(tenant, id)
        .first<{ coach_id: string; start: number }>();
      if (dupe)
        return dupe.coach_id === input.coachId && dupe.start === input.start
          ? reply({ ok: true, replayed: true, id })
          : error('Mã yêu cầu đã dùng cho thao tác khác', 409);
      const known = await d
        .prepare('SELECT id FROM customers WHERE tenant=? AND phone=?')
        .bind(tenant, phone)
        .first<{ id: string }>();
      await d
        .prepare(CREATE_LESSON_SQL)
        .bind(
          id,
          tenant,
          input.coachId,
          known?.id ?? null,
          input.customerName,
          phone,
          input.start,
          input.minutes,
          null,
          input.price,
          input.note,
          actor.userId,
          'lesson-' + input.requestId,
          now,
        )
        .run();
      return reply({ ok: true, id, customerLinked: !!known });
    }
    if (input.action === 'lesson-reschedule') {
      if (!can(actor.role, 'coach.schedule')) return error('Bạn không có quyền xếp lịch học', 403);
      if (input.start % 900_000 !== 0) return error('Giờ bắt đầu phải cách nhau 15 phút');
      if (input.start < now) return error('Giờ bắt đầu phải ở tương lai');
      const r = await d
        .prepare(RESCHEDULE_LESSON_SQL)
        .bind(input.coachId, input.start, input.minutes, input.note, tenant, input.id)
        .run();
      return r.meta.changes
        ? reply({ ok: true })
        : error('Buổi học không còn ở trạng thái đã đặt', 409);
    }
    // Status and notes: schedulers for any lesson, HLV only for their own.
    const lesson = await d
      .prepare('SELECT id,coach_id,start,status FROM lessons WHERE tenant=? AND id=?')
      .bind(tenant, input.id)
      .first<{ id: string; coach_id: string; start: number; status: string }>();
    if (!lesson) return error('Không tìm thấy buổi học', 404);
    const scheduler = can(actor.role, 'coach.schedule');
    if (!scheduler) {
      if (!can(actor.role, 'coach.own')) return error('Bạn không có quyền thao tác', 403);
      if ((await myCoachId(actor)) !== lesson.coach_id)
        return error('Bạn chỉ thao tác được buổi học của mình', 403);
    }
    if (input.action === 'lesson-note') {
      await d.prepare(NOTE_LESSON_SQL).bind(input.coachNote, tenant, input.id).run();
      return reply({ ok: true });
    }
    if (!scheduler && input.status === 'cancelled')
      return error('HLV không tự hủy buổi học; hãy báo nhân viên', 403);
    if (input.status !== 'cancelled' && lesson.start > now)
      return error('Buổi học chưa diễn ra nên chưa thể đánh dấu', 409);
    const r = await d
      .prepare(SET_LESSON_STATUS_SQL)
      .bind(input.status, input.coachNote, input.coachNote, tenant, input.id)
      .run();
    return r.meta.changes ? reply({ ok: true }) : error('Buổi học đã được xử lý trước đó', 409);
  } catch (e) {
    return explain(e);
  }
}
