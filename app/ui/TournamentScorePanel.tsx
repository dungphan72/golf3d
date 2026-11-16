'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Save, Trash2, Trophy, UserPlus, Users, XCircle } from 'lucide-react';
import {
  GROUPS,
  grossOf,
  hcpText,
  leaderboard,
  sumPars,
  toParText,
  type RoundDef,
  type Score,
} from '../../lib/tournament-score';
import { askConfirm } from './kit';
import '../tournament-score-admin.css';

type Player = { id: string; name: string; phone: string; hcp10: number; grp: string };
type Card = {
  id: string;
  roundId: string;
  playerId: string;
  holes: Score[];
  status: string;
  enteredBy: string;
  enteredByName: string;
  note: string;
};
type State = {
  event: { id: string; title: string };
  rounds: RoundDef[];
  players: Player[];
  scores: Card[];
  signupsLeft: { name: string; phone: string }[];
  canApprove: boolean;
};

async function call(body?: unknown, query = '') {
  const r = await fetch('/api/tournament-score' + query, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const v = (await r.json()) as { error?: string } & Record<string, unknown>;
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}
const parseHcp = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 10) : NaN;
};
const STATUS: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  pending: 'Golfer nhập · chờ duyệt',
  rejected: 'Không duyệt',
  draft: 'Chưa đủ hố',
};

/** Rounds, golfers, score entry, approval and the ranking of one tournament. */
export function TournamentScorePanel({ events }: { events: { id: string; title: string }[] }) {
  const [postId, setPostId] = useState(events[0]?.id ?? '');
  const [st, setSt] = useState<State | null>(null);
  const [roundId, setRoundId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      const v = (await call(undefined, '?post=' + encodeURIComponent(postId))) as unknown as State;
      setSt(v);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [postId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the tournament changes
    void load();
  }, [load]);

  async function act(body: unknown, done: string) {
    try {
      await call(body);
      setMsg(done);
      setError('');
      await load();
    } catch (e) {
      setMsg('');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const rounds = st?.rounds ?? [];
  const round = rounds.find((r) => r.id === (roundId || rounds[0]?.id)) ?? null;
  const board = useMemo(
    () =>
      st
        ? leaderboard(
            st.players.map((p) => ({ id: p.id, name: p.name, hcp10: p.hcp10, group: p.grp })),
            st.rounds,
            st.scores.map((s) => ({ roundId: s.roundId, playerId: s.playerId, holes: s.holes, status: s.status })),
          )
        : [],
    [st],
  );
  const pending = (st?.scores ?? []).filter((s) => s.status === 'pending');

  if (!events.length)
    return (
      <section className="tsa">
        <p className="tsa-empty">Chưa có giải đấu nào. Hãy tạo giải đấu ở tab &ldquo;Danh sách giải đấu&rdquo; trước.</p>
      </section>
    );

  return (
    <section className="tsa">
      <header className="tsa-head">
        <div>
          <h3>
            <Trophy size={20} /> Điểm &amp; xếp hạng
          </h3>
          <p>Tạo vòng đấu, thêm golfer, nhập điểm từng hố và duyệt điểm golfer tự nhập.</p>
        </div>
        <label className="tsa-pick">
          Giải đấu
          <select value={postId} onChange={(e) => { setPostId(e.target.value); setRoundId(''); setSt(null); }}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <div className="tsa-error" role="alert">
          {error}
        </div>
      )}
      {msg && (
        <div className="tsa-ok" role="status">
          {msg}
        </div>
      )}

      {st && (
        <>
          {pending.length > 0 && (
            <div className="tsa-block tsa-pending">
              <h4>
                Chờ duyệt ({pending.length}) {!st.canApprove && <small>Chỉ chủ cơ sở được duyệt</small>}
              </h4>
              {pending.map((c) => {
                const p = st.players.find((x) => x.id === c.playerId);
                const r = rounds.find((x) => x.id === c.roundId);
                if (!p || !r) return null;
                const g = grossOf(c.holes);
                return (
                  <div key={c.id} className="tsa-pend">
                    <div>
                      <strong>{p.name}</strong> · {r.name}
                      <small>
                        {c.holes.join(' ')} · {g} gậy ({g != null ? toParText(g - sumPars(r.pars)) : '–'})
                      </small>
                    </div>
                    {st.canApprove && (
                      <div className="tsa-btns">
                        <button type="button" className="tsa-primary" onClick={() => act({ action: 'score-review', id: c.id, decision: 'confirm' }, 'Đã xác nhận thẻ điểm.')}>
                          <CheckCircle2 size={16} /> Duyệt
                        </button>
                        <button
                          type="button"
                          className="tsa-ghost"
                          onClick={() => {
                            const note = window.prompt('Lý do không duyệt thẻ điểm này:', '');
                            if (note !== null) void act({ action: 'score-review', id: c.id, decision: 'reject', note }, 'Đã từ chối thẻ điểm.');
                          }}
                        >
                          <XCircle size={16} /> Không duyệt
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="tsa-block">
            <div className="tsa-row-head">
              <h4>Vòng đấu</h4>
              <div className="tsa-btns">
                <button type="button" className="tsa-ghost" onClick={() => act({ action: 'round-add', postId, holes: 18 }, 'Đã thêm vòng 18 hố.')}>
                  <Plus size={15} /> Vòng 18 hố
                </button>
                <button type="button" className="tsa-ghost" onClick={() => act({ action: 'round-add', postId, holes: 9 }, 'Đã thêm vòng 9 hố.')}>
                  <Plus size={15} /> Vòng 9 hố
                </button>
              </div>
            </div>
            {!rounds.length && <p className="tsa-empty">Chưa có vòng đấu. Par mặc định là mẫu tiêu chuẩn, hãy sửa theo sân thi đấu.</p>}
            {rounds.map((r) => (
              <RoundEditor
                key={r.id}
                round={r}
                used={st.scores.some((s) => s.roundId === r.id)}
                onSave={(name, pars) => act({ action: 'round-update', id: r.id, name, pars }, 'Đã lưu vòng đấu.')}
                onDelete={async () => {
                  if (await askConfirm({ title: `Xóa ${r.name}?`, confirmLabel: 'Xóa vòng' }))
                    await act({ action: 'round-delete', id: r.id }, 'Đã xóa vòng đấu.');
                }}
              />
            ))}
          </div>

          <div className="tsa-block">
            <div className="tsa-row-head">
              <h4>
                <Users size={18} /> Golfer ({st.players.length})
              </h4>
              {st.signupsLeft.length > 0 && (
                <button type="button" className="tsa-ghost" onClick={() => act({ action: 'player-import', postId }, 'Đã nhập golfer từ danh sách đăng ký. Hãy nhập HCP cho từng người.')}>
                  <UserPlus size={15} /> Nhập {st.signupsLeft.length} người đã đăng ký
                </button>
              )}
            </div>
            <PlayerAdd onAdd={(name, phone, hcp10) => act({ action: 'player-add', postId, name, phone, hcp10 }, 'Đã thêm golfer.')} />
            <div className="tsa-scroll">
              <table className="tsa-table">
                <thead>
                  <tr>
                    <th>Golfer</th>
                    <th>Số điện thoại</th>
                    <th>HCP</th>
                    <th>Nhóm</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {st.players.map((p) => (
                    <PlayerRow
                      key={p.id}
                      p={p}
                      used={st.scores.some((s) => s.playerId === p.id)}
                      onSave={(hcp10, group) => act({ action: 'player-update', id: p.id, hcp10, group }, 'Đã lưu golfer.')}
                      onRemove={async () => {
                        if (await askConfirm({ title: `Xóa ${p.name} khỏi giải?`, confirmLabel: 'Xóa golfer' }))
                          await act({ action: 'player-remove', id: p.id }, 'Đã xóa golfer.');
                      }}
                    />
                  ))}
                  {!st.players.length && (
                    <tr>
                      <td colSpan={5} className="tsa-empty">
                        Chưa có golfer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {round && st.players.length > 0 && (
            <div className="tsa-block">
              <div className="tsa-row-head">
                <h4>Nhập điểm</h4>
                <label className="tsa-pick sm">
                  Vòng
                  <select value={round.id} onChange={(e) => setRoundId(e.target.value)}>
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.holes} hố)
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="tsa-scroll">
                <table className="tsa-table tsa-entry">
                  <thead>
                    <tr>
                      <th>Golfer</th>
                      {round.pars.map((p, i) => (
                        <th key={i} className="h">
                          {i + 1}
                          <small>P{p}</small>
                        </th>
                      ))}
                      <th>Gậy</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {st.players.map((p) => (
                      <EntryRow
                        key={p.id + round.id}
                        round={round}
                        p={p}
                        card={st.scores.find((s) => s.roundId === round.id && s.playerId === p.id)}
                        onSave={(holes) => act({ action: 'score-enter', roundId: round.id, playerId: p.id, holes }, `Đã lưu điểm của ${p.name}.`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="tsa-block">
            <h4>Bảng xếp hạng (thẻ điểm đã xác nhận)</h4>
            <div className="tsa-scroll">
              <table className="tsa-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Golfer</th>
                    <th>Nhóm</th>
                    <th>HCP</th>
                    <th>Gross</th>
                    <th>Net</th>
                    <th>±Par</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((r) => (
                    <tr key={r.playerId}>
                      <td>{r.rank ?? '–'}</td>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td>{r.group}</td>
                      <td>{hcpText(r.hcp10)}</td>
                      <td>{r.gross ?? '–'}</td>
                      <td>
                        <b>{r.net ?? '–'}</b>
                      </td>
                      <td>{r.toPar == null ? '–' : toParText(r.toPar)}</td>
                    </tr>
                  ))}
                  {!board.length && (
                    <tr>
                      <td colSpan={7} className="tsa-empty">
                        Chưa có kết quả.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="tsa-hint">
              Trang công khai: <a href={`/giai-dau/${postId}`} target="_blank" rel="noopener noreferrer">/giai-dau/{postId.slice(0, 8)}…</a>
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function RoundEditor({
  round,
  used,
  onSave,
  onDelete,
}: {
  round: RoundDef;
  used: boolean;
  onSave: (name: string, pars: number[]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(round.name);
  const [pars, setPars] = useState(round.pars);
  const dirty = name !== round.name || pars.some((p, i) => p !== round.pars[i]);
  return (
    <div className="tsa-round">
      <div className="tsa-round-top">
        <input aria-label="Tên vòng" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <span>
          {round.holes} hố · Par {sumPars(pars)}
        </span>
        <div className="tsa-btns">
          <button type="button" className="tsa-primary" disabled={!dirty} onClick={() => onSave(name, pars)}>
            <Save size={15} /> Lưu
          </button>
          <button type="button" className="tsa-ghost danger" disabled={used} title={used ? 'Đã có thẻ điểm' : ''} onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="tsa-pars">
        {pars.map((p, i) => (
          <label key={i}>
            <small>{i + 1}</small>
            <select value={p} aria-label={`Par hố ${i + 1}`} onChange={(e) => setPars(pars.map((x, k) => (k === i ? Number(e.target.value) : x)))}>
              {[3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function PlayerAdd({ onAdd }: { onAdd: (name: string, phone: string, hcp10: number) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hcp, setHcp] = useState('');
  const hcp10 = parseHcp(hcp || '0');
  return (
    <form
      className="tsa-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!Number.isFinite(hcp10)) return;
        onAdd(name, phone, hcp10);
        setName('');
        setPhone('');
        setHcp('');
      }}
    >
      <input placeholder="Tên golfer" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Số điện thoại" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input placeholder="HCP (VD: 12,4)" inputMode="decimal" value={hcp} onChange={(e) => setHcp(e.target.value)} />
      <button type="submit" className="tsa-primary">
        <Plus size={15} /> Thêm golfer
      </button>
    </form>
  );
}

function PlayerRow({
  p,
  used,
  onSave,
  onRemove,
}: {
  p: Player;
  used: boolean;
  onSave: (hcp10: number, group: string) => void;
  onRemove: () => void;
}) {
  const [hcp, setHcp] = useState(hcpText(p.hcp10));
  const [group, setGroup] = useState(p.grp);
  const n = parseHcp(hcp);
  const dirty = (Number.isFinite(n) && n !== p.hcp10) || group !== p.grp;
  return (
    <tr>
      <td>
        <strong>{p.name}</strong>
      </td>
      <td>{p.phone}</td>
      <td>
        <input className="tsa-sm" aria-label={`HCP của ${p.name}`} inputMode="decimal" value={hcp} onChange={(e) => setHcp(e.target.value)} />
      </td>
      <td>
        <select aria-label={`Nhóm của ${p.name}`} value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
      <td className="tsa-btns">
        <button type="button" className="tsa-primary" disabled={!dirty || !Number.isFinite(n)} onClick={() => onSave(n, group)}>
          Lưu
        </button>
        <button type="button" className="tsa-ghost danger" disabled={used} title={used ? 'Đã có thẻ điểm' : ''} onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

function EntryRow({
  round,
  p,
  card,
  onSave,
}: {
  round: RoundDef;
  p: Player;
  card?: Card;
  onSave: (holes: Score[]) => void;
}) {
  const [holes, setHoles] = useState<Score[]>(card?.holes ?? round.pars.map(() => null));
  const dirty = holes.some((h, i) => h !== (card?.holes[i] ?? null));
  const filled = holes.filter((h) => h != null).length;
  const sum = holes.reduce<number>((a, b) => a + (b ?? 0), 0);
  return (
    <tr>
      <td>
        <strong>{p.name}</strong>
      </td>
      {holes.map((h, i) => (
        <td key={i} className="h">
          <input
            aria-label={`${p.name} hố ${i + 1}`}
            inputMode="numeric"
            value={h ?? ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setHoles(holes.map((x, k) => (k === i ? (v === '' ? null : Math.min(15, Math.max(1, Number(v)))) : x)));
            }}
          />
        </td>
      ))}
      <td>
        <b>{filled ? sum : '–'}</b>
      </td>
      <td>
        <span className={'tsa-chip ' + (card?.status ?? 'none')}>{card ? STATUS[card.status] : 'Chưa nhập'}</span>
      </td>
      <td>
        <button type="button" className="tsa-primary" disabled={!dirty || filled === 0} onClick={() => onSave(holes)}>
          Lưu
        </button>
      </td>
    </tr>
  );
}
