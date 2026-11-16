import { z } from 'zod';
import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { adminState, staffAction, type StaffAction } from '../../../lib/server/tournament-score-service';
export const dynamic = 'force-dynamic';

const id = z.string().min(1).max(80);
const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('round-add'),
    postId: id,
    name: z.string().max(60).optional(),
    holes: z.number().int(),
    pars: z.array(z.number().int()).max(18).optional(),
    date: z.string().max(10).optional(),
  }),
  z.object({
    action: z.literal('round-update'),
    id,
    name: z.string().max(60),
    pars: z.array(z.number().int()).max(18),
    date: z.string().max(10).optional(),
  }),
  z.object({ action: z.literal('round-delete'), id }),
  z.object({
    action: z.literal('player-add'),
    postId: id,
    name: z.string().max(100),
    phone: z.string().max(30),
    hcp10: z.number().int(),
    group: z.string().max(2).optional(),
  }),
  z.object({ action: z.literal('player-import'), postId: id }),
  z.object({
    action: z.literal('player-update'),
    id,
    name: z.string().max(100).optional(),
    hcp10: z.number().int().optional(),
    group: z.string().max(2).optional(),
  }),
  z.object({ action: z.literal('player-remove'), id }),
  z.object({
    action: z.literal('score-enter'),
    roundId: id,
    playerId: id,
    holes: z.array(z.number().int().nullable()).max(18),
  }),
  z.object({
    action: z.literal('score-review'),
    id,
    decision: z.enum(['confirm', 'reject']),
    note: z.string().max(300).optional(),
  }),
]);

export async function GET(req: Request) {
  const { auth, response } = await authorize('tournament.score');
  if (response) return response;
  const post = new URL(req.url).searchParams.get('post') ?? '';
  return sendResult(await adminState(auth, post));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('tournament.score');
  if (response) return response;
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  return sendResult(await staffAction(auth, body as StaffAction));
}
