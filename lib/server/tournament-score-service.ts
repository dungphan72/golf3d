import type { AuthUser } from './auth-service';
import type { MemberUser } from './member-account-service';
import { audit, db, fail, ok, type ServiceResult } from './common';
import { can } from '../auth/permissions';
import { normalizePhone, validPhone } from '../member';
import {
  defaultPars,
  grossOf,
  groupFor,
  GROUPS,
  HOLE_CHOICES,
  leaderboard,
  parsProblem,
  strokesProblem,
  type Holes,
  type PlayerDef,
  type RoundDef,
  type Score,
  type ScoreRow,
} from '../tournament-score';

type EventRow = {
  id: string;
  title: string;
  summary: string;
  image: string;
  event_at: number | null;
  place: string;
  status: string;
};
type RoundRaw = { id: string; round_no: number; name: string; holes: number; pars: string };
type PlayerRaw = { id: string; name: string; phone: string; hcp10: number; grp: string };
type ScoreRaw = {
  id: string;
  round_id: string;
  player_id: string;
  holes: string;
  status: string;
  entered_by: string;
  entered_by_name: string;
  updated: number;
  reviewed_by_name: string;
  reviewed_at: number | null;
  review_note: string;
};

const json = <T>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};
const toRound = (r: RoundRaw): RoundDef => ({
  id: r.id,
  no: r.round_no,
  name: r.name,
  holes: r.holes as Holes,
  pars: json<number[]>(r.pars, []),
});

async function eventOf(tenant: string, postId: string, publicOnly: boolean) {
  const e = await db()
    .prepare(
      "SELECT id,title,summary,image,event_at,place,status FROM posts WHERE tenant=? AND id=? AND kind='event'",
    )
    .bind(tenant, postId)
    .first<EventRow>();
  if (!e || (publicOnly && e.status !== 'published')) return null;
  return e;
}

async function load(tenant: string, postId: string) {
  const [rounds, players] = await Promise.all([
    db()
      .prepare('SELECT id,round_no,name,holes,pars FROM tournament_rounds WHERE tenant=? AND post_id=? ORDER BY round_no')
      .bind(tenant, postId)
      .all<RoundRaw>(),
    db()
      .prepare('SELECT id,name,phone,hcp10,grp FROM tournament_players WHERE tenant=? AND post_id=? ORDER BY name')
      .bind(tenant, postId)
      .all<PlayerRaw>(),
  ]);
  const roundIds = rounds.results.map((r) => r.id);
  const scores = roundIds.length
    ? (
        await db()
          .prepare(
            `SELECT id,round_id,player_id,holes,status,entered_by,entered_by_name,updated,reviewed_by_name,reviewed_at,review_note FROM tournament_scores WHERE tenant=? AND round_id IN (${roundIds.map(() => '?').join(',')})`,
          )
          .bind(tenant, ...roundIds)
          .all<ScoreRaw>()
      ).results
    : [];
  return { rounds: rounds.results.map(toRound), players: players.results, scores };
}

const playerDefs = (ps: PlayerRaw[]): PlayerDef[] =>
  ps.map((p) => ({ id: p.id, name: p.name, hcp10: p.hcp10, group: p.grp }));
const scoreRows = (ss: ScoreRaw[]): ScoreRow[] =>
  ss.map((s) => ({ roundId: s.round_id, playerId: s.player_id, holes: json<Score[]>(s.holes, []), status: s.status }));

const eventPublic = (e: EventRow) => ({
  id: e.id,
  title: e.title,
  summary: e.summary,
  image: e.image,
  event_at: e.event_at,
  place: e.place,
});

/** Public ranking of a published tournament: confirmed score cards only, no phone numbers. */
export async function publicBoard(
  tenant: string,
  postId: string,
  roundId: string | null,
  group: string | null,
): Promise<ServiceResult> {
  const e = await eventOf(tenant, postId, true);
  if (!e) return fail('Không tìm thấy giải đấu', 404);
  const { rounds, players, scores } = await load(tenant, postId);
  const rows = leaderboard(playerDefs(players), rounds, scoreRows(scores), {
    roundId: roundId && rounds.some((r) => r.id === roundId) ? roundId : null,
    group: group && (GROUPS as readonly string[]).includes(group) ? group : null,
  });
  return ok({
    event: eventPublic(e),
    rounds,
    groups: [...new Set(players.map((p) => p.grp))].sort(),
    rows,
    players: players.length,
  });
}

/** Everything a golfer sees about themself: their place in the list and their score cards. */
export async function memberTournament(user: MemberUser, postId: string): Promise<ServiceResult> {
  const e = await eventOf(user.tenant, postId, true);
  if (!e) return fail('Không tìm thấy giải đấu', 404);
  const { rounds, players, scores } = await load(user.tenant, postId);
  const me = players.find((p) => p.phone === user.phone);
  const board = leaderboard(playerDefs(players), rounds, scoreRows(scores));
  const mine = me ? board.find((r) => r.playerId === me.id) : null;
  return ok({
    verified: user.verified,
    player: me ? { id: me.id, name: me.name, hcp10: me.hcp10, group: me.grp } : null,
    rounds,
    standing: mine ? { rank: mine.rank, gross: mine.gross, net: mine.net, toPar: mine.toPar } : null,
    cards: me
      ? scores
          .filter((s) => s.player_id === me.id)
          .map((s) => ({
            id: s.id,
            roundId: s.round_id,
            holes: json<Score[]>(s.holes, []),
            status: s.status,
            note: s.review_note,
            enteredBy: s.entered_by,
          }))
      : [],
  });
}

/** A golfer types their own score card; it waits for the owner before it counts. */
export async function memberSubmitScore(
  user: MemberUser,
  input: { postId: string; roundId: string; holes: unknown },
): Promise<ServiceResult> {
  if (!user.verified) return fail('Tài khoản cần được câu lạc bộ xác nhận số điện thoại trước khi nhập điểm', 403);
  const e = await eventOf(user.tenant, input.postId, true);
  if (!e) return fail('Không tìm thấy giải đấu', 404);
  const player = await db()
    .prepare('SELECT id FROM tournament_players WHERE tenant=? AND post_id=? AND phone=?')
    .bind(user.tenant, input.postId, user.phone)
    .first<{ id: string }>();
  if (!player) return fail('Bạn chưa có tên trong danh sách thi đấu. Hãy liên hệ ban tổ chức.', 403);
  const round = await db()
    .prepare('SELECT id,holes FROM tournament_rounds WHERE tenant=? AND post_id=? AND id=?')
    .bind(user.tenant, input.postId, input.roundId)
    .first<{ id: string; holes: number }>();
  if (!round) return fail('Không tìm thấy vòng đấu', 404);
  const problem = strokesProblem(round.holes, input.holes);
  if (problem) return fail(problem);
  const holes = input.holes as Score[];
  if (grossOf(holes) == null) return fail('Cần nhập đủ số gậy của tất cả các hố');
  const existing = await db()
    .prepare('SELECT id,status FROM tournament_scores WHERE round_id=? AND player_id=?')
    .bind(round.id, player.id)
    .first<{ id: string; status: string }>();
  if (existing?.status === 'confirmed')
    return fail('Thẻ điểm này đã được xác nhận. Hãy liên hệ ban tổ chức nếu cần sửa.', 409);
  const now = Date.now();
  if (existing) {
    await db()
      .prepare(
        "UPDATE tournament_scores SET holes=?,status='pending',entered_by='player',entered_by_name=?,updated=?,reviewed_by_name='',reviewed_at=NULL,review_note='' WHERE id=?",
      )
      .bind(JSON.stringify(holes), user.phone, now, existing.id)
      .run();
  } else {
    await db()
      .prepare(
        "INSERT INTO tournament_scores(id,tenant,round_id,player_id,holes,status,entered_by,entered_by_name,updated) VALUES (?,?,?,?,?,'pending','player',?,?)",
      )
      .bind(crypto.randomUUID(), user.tenant, round.id, player.id, JSON.stringify(holes), user.phone, now)
      .run();
  }
  await audit(user.tenant, 'Golfer nhập điểm (chờ duyệt)', `${e.title} · ${user.phone}`);
  return ok({ status: 'pending' });
}

// ---- Staff side ----

export async function adminState(actor: AuthUser, postId: string): Promise<ServiceResult> {
  const e = await eventOf(actor.tenant, postId, false);
  if (!e) return fail('Không tìm thấy giải đấu', 404);
  const { rounds, players, scores } = await load(actor.tenant, postId);
  const signups = (
    await db()
      .prepare('SELECT name,phone FROM event_signups WHERE tenant=? AND post_id=? ORDER BY created')
      .bind(actor.tenant, postId)
      .all<{ name: string; phone: string }>()
  ).results;
  const have = new Set(players.map((p) => p.phone));
  return ok({
    event: eventPublic(e),
    rounds,
    players,
    scores: scores.map((s) => ({
      id: s.id,
      roundId: s.round_id,
      playerId: s.player_id,
      holes: json<Score[]>(s.holes, []),
      status: s.status,
      enteredBy: s.entered_by,
      enteredByName: s.entered_by_name,
      updated: s.updated,
      reviewedByName: s.reviewed_by_name,
      note: s.review_note,
    })),
    signupsLeft: signups.filter((s) => !have.has(s.phone)),
    canApprove: can(actor.role, 'tournament.approve'),
  });
}

export type StaffAction =
  | { action: 'round-add'; postId: string; name?: string; holes: number; pars?: number[] }
  | { action: 'round-update'; id: string; name: string; pars: number[] }
  | { action: 'round-delete'; id: string }
  | { action: 'player-add'; postId: string; name: string; phone: string; hcp10: number; group?: string }
  | { action: 'player-import'; postId: string }
  | { action: 'player-update'; id: string; name?: string; hcp10?: number; group?: string }
  | { action: 'player-remove'; id: string }
  | { action: 'score-enter'; roundId: string; playerId: string; holes: unknown }
  | { action: 'score-review'; id: string; decision: 'confirm' | 'reject'; note?: string };

async function roundOwned(tenant: string, id: string) {
  return db()
    .prepare('SELECT id,post_id,holes,name FROM tournament_rounds WHERE tenant=? AND id=?')
    .bind(tenant, id)
    .first<{ id: string; post_id: string; holes: number; name: string }>();
}
async function playerOwned(tenant: string, id: string) {
  return db()
    .prepare('SELECT id,post_id,name FROM tournament_players WHERE tenant=? AND id=?')
    .bind(tenant, id)
    .first<{ id: string; post_id: string; name: string }>();
}

export async function staffAction(actor: AuthUser, a: StaffAction): Promise<ServiceResult> {
  if (!can(actor.role, 'tournament.score')) return fail('Bạn không có quyền nhập điểm giải đấu', 403);
  const t = actor.tenant;
  const now = Date.now();
  switch (a.action) {
    case 'round-add': {
      const e = await eventOf(t, a.postId, false);
      if (!e) return fail('Không tìm thấy giải đấu', 404);
      if (!(HOLE_CHOICES as readonly number[]).includes(a.holes)) return fail('Giải chơi 9 hoặc 18 hố');
      const pars = a.pars ?? defaultPars(a.holes as Holes);
      const p = parsProblem(a.holes, pars);
      if (p) return fail(p);
      const next =
        ((await db()
          .prepare('SELECT MAX(round_no) AS n FROM tournament_rounds WHERE tenant=? AND post_id=?')
          .bind(t, a.postId)
          .first<{ n: number | null }>())?.n ?? 0) + 1;
      if (next > 10) return fail('Tối đa 10 vòng đấu');
      const name = (a.name ?? '').trim().slice(0, 60) || `Vòng ${next}`;
      await db()
        .prepare('INSERT INTO tournament_rounds(id,tenant,post_id,round_no,name,holes,pars,created) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), t, a.postId, next, name, a.holes, JSON.stringify(pars), now)
        .run();
      await audit(t, 'Thêm vòng đấu', `${e.title} · ${name}`);
      return ok();
    }
    case 'round-update': {
      const r = await roundOwned(t, a.id);
      if (!r) return fail('Không tìm thấy vòng đấu', 404);
      const p = parsProblem(r.holes, a.pars);
      if (p) return fail(p);
      const name = a.name.trim().slice(0, 60) || r.name;
      await db()
        .prepare('UPDATE tournament_rounds SET name=?,pars=? WHERE tenant=? AND id=?')
        .bind(name, JSON.stringify(a.pars), t, a.id)
        .run();
      await audit(t, 'Sửa vòng đấu', name);
      return ok();
    }
    case 'round-delete': {
      const r = await roundOwned(t, a.id);
      if (!r) return fail('Không tìm thấy vòng đấu', 404);
      const used = await db().prepare('SELECT 1 AS x FROM tournament_scores WHERE round_id=? LIMIT 1').bind(a.id).first();
      if (used) return fail('Vòng đấu đã có thẻ điểm, không xóa được', 409);
      await db().prepare('DELETE FROM tournament_rounds WHERE tenant=? AND id=?').bind(t, a.id).run();
      await audit(t, 'Xóa vòng đấu', r.name);
      return ok();
    }
    case 'player-add': {
      const e = await eventOf(t, a.postId, false);
      if (!e) return fail('Không tìm thấy giải đấu', 404);
      const name = a.name.trim().slice(0, 100);
      if (name.length < 2) return fail('Vui lòng nhập tên golfer');
      const phone = normalizePhone(a.phone);
      if (!validPhone(phone)) return fail('Số điện thoại không hợp lệ');
      if (!Number.isInteger(a.hcp10) || a.hcp10 < -50 || a.hcp10 > 540) return fail('HCP từ -5 đến 54');
      const group = a.group && (GROUPS as readonly string[]).includes(a.group) ? a.group : groupFor(a.hcp10);
      try {
        await db()
          .prepare('INSERT INTO tournament_players(id,tenant,post_id,name,phone,hcp10,grp,created) VALUES (?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), t, a.postId, name, phone, a.hcp10, group, now)
          .run();
      } catch {
        return fail('Số điện thoại này đã có trong danh sách thi đấu', 409);
      }
      await audit(t, 'Thêm golfer thi đấu', `${e.title} · ${name}`);
      return ok();
    }
    case 'player-import': {
      const e = await eventOf(t, a.postId, false);
      if (!e) return fail('Không tìm thấy giải đấu', 404);
      const r = await db()
        .prepare(
          `INSERT OR IGNORE INTO tournament_players(id,tenant,post_id,name,phone,hcp10,grp,created)
           SELECT lower(hex(randomblob(16))),tenant,post_id,name,phone,0,'A',? FROM event_signups WHERE tenant=? AND post_id=?`,
        )
        .bind(now, t, a.postId)
        .run();
      await audit(t, 'Nhập golfer từ danh sách đăng ký', `${e.title} · ${r.meta.changes} người`);
      return ok({ added: r.meta.changes });
    }
    case 'player-update': {
      const p = await playerOwned(t, a.id);
      if (!p) return fail('Không tìm thấy golfer', 404);
      if (a.hcp10 !== undefined && (!Number.isInteger(a.hcp10) || a.hcp10 < -50 || a.hcp10 > 540))
        return fail('HCP từ -5 đến 54');
      if (a.group !== undefined && !(GROUPS as readonly string[]).includes(a.group)) return fail('Nhóm không hợp lệ');
      const name = a.name === undefined ? p.name : a.name.trim().slice(0, 100);
      if (name.length < 2) return fail('Vui lòng nhập tên golfer');
      await db()
        .prepare(
          'UPDATE tournament_players SET name=?,hcp10=COALESCE(?,hcp10),grp=COALESCE(?,grp) WHERE tenant=? AND id=?',
        )
        .bind(name, a.hcp10 ?? null, a.group ?? null, t, a.id)
        .run();
      return ok();
    }
    case 'player-remove': {
      const p = await playerOwned(t, a.id);
      if (!p) return fail('Không tìm thấy golfer', 404);
      const used = await db().prepare('SELECT 1 AS x FROM tournament_scores WHERE player_id=? LIMIT 1').bind(a.id).first();
      if (used) return fail('Golfer đã có thẻ điểm, không xóa được', 409);
      await db().prepare('DELETE FROM tournament_players WHERE tenant=? AND id=?').bind(t, a.id).run();
      await audit(t, 'Xóa golfer thi đấu', p.name);
      return ok();
    }
    case 'score-enter': {
      const r = await roundOwned(t, a.roundId);
      const p = await playerOwned(t, a.playerId);
      if (!r || !p || r.post_id !== p.post_id) return fail('Không tìm thấy vòng đấu hoặc golfer', 404);
      const problem = strokesProblem(r.holes, a.holes);
      if (problem) return fail(problem);
      const holes = a.holes as Score[];
      // A staff member's card counts at once. A half-filled card is kept but does not rank yet.
      const done = grossOf(holes) != null;
      const status = done ? 'confirmed' : 'draft';
      const prev = await db()
        .prepare('SELECT id FROM tournament_scores WHERE round_id=? AND player_id=?')
        .bind(a.roundId, a.playerId)
        .first<{ id: string }>();
      if (prev) {
        await db()
          .prepare(
            "UPDATE tournament_scores SET holes=?,status=?,entered_by='staff',entered_by_name=?,updated=?,reviewed_by_name='',reviewed_at=NULL,review_note='' WHERE id=?",
          )
          .bind(JSON.stringify(holes), status, actor.name, now, prev.id)
          .run();
      } else {
        await db()
          .prepare(
            "INSERT INTO tournament_scores(id,tenant,round_id,player_id,holes,status,entered_by,entered_by_name,updated) VALUES (?,?,?,?,?,?,'staff',?,?)",
          )
          .bind(crypto.randomUUID(), t, a.roundId, a.playerId, JSON.stringify(holes), status, actor.name, now)
          .run();
      }
      await audit(t, 'Nhập điểm giải đấu', `${p.name} · ${r.name}${done ? ` · ${grossOf(holes)} gậy` : ' (chưa đủ hố)'}`);
      return ok({ status });
    }
    case 'score-review': {
      if (!can(actor.role, 'tournament.approve')) return fail('Chỉ chủ cơ sở được duyệt điểm golfer tự nhập', 403);
      const row = await db()
        .prepare('SELECT id,status FROM tournament_scores WHERE tenant=? AND id=?')
        .bind(t, a.id)
        .first<{ id: string; status: string }>();
      if (!row) return fail('Không tìm thấy thẻ điểm', 404);
      if (row.status !== 'pending') return fail('Thẻ điểm này đã được xử lý', 409);
      const note = (a.note ?? '').trim().slice(0, 300);
      if (a.decision === 'reject' && note.length < 3) return fail('Vui lòng nhập lý do không duyệt');
      await db()
        .prepare("UPDATE tournament_scores SET status=?,reviewed_by_name=?,reviewed_at=?,review_note=? WHERE id=? AND status='pending'")
        .bind(a.decision === 'confirm' ? 'confirmed' : 'rejected', actor.name, now, note, a.id)
        .run();
      await audit(t, a.decision === 'confirm' ? 'Duyệt điểm giải đấu' : 'Không duyệt điểm giải đấu', note || a.id.slice(-6));
      return ok();
    }
  }
}
