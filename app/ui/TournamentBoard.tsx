'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Flag, Info, ListOrdered, MapPin, Minus, Plus, Trophy, User, X } from 'lucide-react';
import {
  holeTone,
  hcpText,
  sumPars,
  toParText,
  type BoardRow,
  type RoundDef,
  type Score,
} from '../../lib/tournament-score';
import '../tournament-board.css';

export type BoardData = {
  event: { id: string; title: string; summary: string; image: string; event_at: number | null; place: string };
  rounds: RoundDef[];
  groups: string[];
  rows: BoardRow[];
  players: number;
};
type Me = {
  signedOut?: boolean;
  verified?: boolean;
  player?: { id: string; name: string; hcp10: number; group: string } | null;
  rounds?: RoundDef[];
  standing?: { rank: number | null; gross: number | null; net: number | null; toPar: number | null } | null;
  cards?: { id: string; roundId: string; holes: Score[]; status: string; note: string; enteredBy: string }[];
  error?: string;
};
type Tab = 'board' | 'rounds' | 'mine' | 'info';

const dateText = (ms: number | null) =>
  ms == null
    ? ''
    : new Date(ms).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? '?').slice(0, 2)) || '?').toLocaleUpperCase('vi-VN');
};
const toneOfPar = (n: number | null) => (n == null ? '' : n > 0 ? 'over' : n < 0 ? 'under' : 'even');

/** One half (9 holes) of a score card: hole numbers, par and strokes, coloured against par. */
function Half({ start, pars, holes }: { start: number; pars: number[]; holes: Score[] }) {
  const idx = Array.from({ length: Math.min(9, pars.length - start) }, (_, i) => start + i);
  if (!idx.length) return null;
  const out = idx.reduce((a, i) => a + (holes[i] ?? 0), 0);
  const parSum = sumPars(idx.map((i) => pars[i]));
  return (
    <div className="tb-half">
      <table>
        <tbody>
          <tr>
            <th scope="row">Hố</th>
            {idx.map((i) => (
              <td key={i}>{i + 1}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Par</th>
            {idx.map((i) => (
              <td key={i}>{pars[i]}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Điểm</th>
            {idx.map((i) => (
              <td key={i}>
                <span className={'tb-hole ' + holeTone(holes[i] ?? null, pars[i])}>{holes[i] ?? '–'}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="tb-sub">
        <small>{start === 0 ? 'OUT' : 'IN'}</small>
        <strong>{out || '–'}</strong>
        <small>Par {parSum}</small>
      </div>
    </div>
  );
}

function ScoreCard({ round, holes }: { round: RoundDef; holes: Score[] }) {
  const done = holes.length > 0 && holes.every((h) => h != null);
  const gross = done ? (holes as number[]).reduce((a, b) => a + b, 0) : null;
  const par = sumPars(round.pars);
  return (
    <div className="tb-card tb-scorecard">
      <h3>Thẻ điểm của tôi – {round.name}</h3>
      <Half start={0} pars={round.pars} holes={holes} />
      {round.holes === 18 && <Half start={9} pars={round.pars} holes={holes} />}
      <div className="tb-total">
        <span>
          Tổng gậy <b>{gross ?? '–'}</b>
        </span>
        <span>
          Par <b>{par}</b>
        </span>
        <span className={'tb-par ' + toneOfPar(gross == null ? null : gross - par)}>
          ±Par <b>{gross == null ? '–' : toParText(gross - par)}</b>
        </span>
      </div>
    </div>
  );
}

function EntryDialog({
  postId,
  rounds,
  cards,
  onClose,
  onSaved,
}: {
  postId: string;
  rounds: RoundDef[];
  cards: NonNullable<Me['cards']>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = rounds.filter((r) => cards.find((c) => c.roundId === r.id)?.status !== 'confirmed');
  const [roundId, setRoundId] = useState(open[0]?.id ?? '');
  const round = rounds.find((r) => r.id === roundId);
  const [strokes, setStrokes] = useState<Record<string, Score[]>>({});
  const holes: Score[] =
    strokes[roundId] ??
    cards.find((c) => c.roundId === roundId)?.holes ??
    (round ? round.pars.map(() => null) : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (i: number, v: number | null) =>
    setStrokes({ ...strokes, [roundId]: holes.map((h, k) => (k === i ? v : h)) });
  const filled = holes.filter((h) => h != null).length;
  const gross = holes.reduce<number>((a, b) => a + (b ?? 0), 0);
  const par = round ? round.pars.slice(0, holes.length).reduce((a, b, i) => a + (holes[i] != null ? b : 0), 0) : 0;

  async function submit() {
    if (!round) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/tournament-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, roundId, holes }),
      });
      const v = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(v.error || 'Không gửi được điểm');
      setDone(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tb-backdrop" onClick={onClose}>
      <div className="tb-dialog" role="dialog" aria-modal="true" aria-label="Nhập điểm thi đấu" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Nhập điểm thi đấu</h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </header>
        {done ? (
          <div className="tb-done">
            <Trophy size={32} />
            <p>Đã gửi thẻ điểm. Điểm sẽ vào bảng xếp hạng sau khi chủ cơ sở xác nhận.</p>
            <button type="button" className="tb-btn solid" onClick={onClose}>
              Đóng
            </button>
          </div>
        ) : !open.length ? (
          <p className="tb-muted">Tất cả các vòng của bạn đã được xác nhận.</p>
        ) : (
          <>
            <label className="tb-select">
              Vòng đấu
              <select value={roundId} onChange={(e) => setRoundId(e.target.value)}>
                {open.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.holes} hố · Par {sumPars(r.pars)}
                  </option>
                ))}
              </select>
            </label>
            <div className="tb-holes">
              {round?.pars.map((p, i) => (
                <div key={i} className={'tb-hole-in ' + holeTone(holes[i] ?? null, p)}>
                  <span>
                    Hố {i + 1} <small>Par {p}</small>
                  </span>
                  <div>
                    <button type="button" aria-label={`Giảm hố ${i + 1}`} onClick={() => set(i, Math.max(1, (holes[i] ?? p + 1) - 1))}>
                      <Minus size={16} />
                    </button>
                    <input
                      inputMode="numeric"
                      aria-label={`Số gậy hố ${i + 1}`}
                      value={holes[i] ?? ''}
                      placeholder={String(p)}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/\D/g, ''));
                        set(i, e.target.value === '' ? null : Math.min(15, Math.max(1, n)));
                      }}
                    />
                    <button type="button" aria-label={`Tăng hố ${i + 1}`} onClick={() => set(i, Math.min(15, (holes[i] ?? p - 1) + 1))}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="tb-entry-total">
              <span>
                Đã nhập {filled}/{holes.length} hố
              </span>
              <strong>
                {gross} gậy · {filled ? toParText(gross - par) : '–'}
              </strong>
            </div>
            {error && (
              <div className="tb-error" role="alert">
                {error}
              </div>
            )}
            <footer>
              <button type="button" className="tb-btn" onClick={onClose} disabled={busy}>
                Hủy
              </button>
              <button type="button" className="tb-btn solid" onClick={submit} disabled={busy || filled < holes.length}>
                {busy ? 'Đang gửi…' : 'Gửi chờ xác nhận'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export function TournamentBoard({ initial, postHref }: { initial: BoardData; postHref: string }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>('board');
  const [roundId, setRoundId] = useState('');
  const [group, setGroup] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [entry, setEntry] = useState(false);
  const postId = initial.event.id;

  const loadBoard = useCallback(async () => {
    const q = new URLSearchParams({ post: postId });
    if (roundId) q.set('round', roundId);
    if (group) q.set('group', group);
    const r = await fetch('/api/tournament-public?' + q, { cache: 'no-store' });
    if (r.ok) setData((await r.json()) as BoardData);
  }, [postId, roundId, group]);
  const loadMe = useCallback(async () => {
    const r = await fetch('/api/tournament-me?post=' + encodeURIComponent(postId), { cache: 'no-store' });
    setMe(r.ok ? ((await r.json()) as Me) : { signedOut: true });
  }, [postId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload the ranking when a filter changes
    void loadBoard();
  }, [loadBoard]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the signed-in golfer's own card, once
    void loadMe();
  }, [loadMe]);

  const rounds = data.rounds;
  const player = me?.player ?? null;
  const myCards = useMemo(() => (me?.cards ?? []).filter((c) => c.status === 'confirmed'), [me]);
  const pending = (me?.cards ?? []).filter((c) => c.status === 'pending');
  const [shown, setShown] = useState('');
  const cardRound = rounds.find((r) => r.id === (shown || myCards[0]?.roundId)) ?? null;
  const cardHoles = cardRound ? (myCards.find((c) => c.roundId === cardRound.id)?.holes ?? null) : null;
  const e = data.event;

  return (
    <main className="tb">
      <section className="tb-hero" aria-labelledby="tb-title">
        {e.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.image} alt="" className="tb-hero-img" />
        )}
        <div className="tb-hero-body">
          <span className="tb-tag">Giải đấu</span>
          <h1 id="tb-title">{e.title}</h1>
          <p>
            {e.event_at != null && (
              <span>
                <CalendarDays size={18} /> {dateText(e.event_at)}
              </span>
            )}
            {e.place && (
              <span>
                <MapPin size={18} /> {e.place}
              </span>
            )}
          </p>
        </div>
        <Trophy className="tb-hero-cup" size={120} aria-hidden="true" />
      </section>

      <nav className="tb-tabs" aria-label="Mục giải đấu">
        {(
          [
            ['board', 'Bảng xếp hạng', ListOrdered],
            ['rounds', 'Vòng đấu', Flag],
            ['mine', 'Kết quả của tôi', User],
            ['info', 'Thông tin giải đấu', Info],
          ] as const
        ).map(([k, label, Icon]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
            <Icon size={18} /> {label}
          </button>
        ))}
        {player && (
          <button type="button" className="tb-cta" onClick={() => setEntry(true)}>
            Nhập điểm thi đấu
          </button>
        )}
      </nav>

      <div className="tb-grid">
        {tab === 'board' && (
          <section className="tb-card tb-board" aria-labelledby="tb-board-title">
            <header className="tb-board-head">
              <div>
                <h2 id="tb-board-title">
                  <Trophy size={28} /> Bảng xếp hạng chung
                </h2>
                <p>
                  {data.players
                    ? `${data.players} golfer · tính theo thẻ điểm đã xác nhận`
                    : 'Chưa có golfer trong danh sách thi đấu'}
                </p>
              </div>
              <div className="tb-filters">
                <label>
                  Vòng đấu
                  <select value={roundId} onChange={(ev) => setRoundId(ev.target.value)}>
                    <option value="">Tổng các vòng</option>
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nhóm
                  <select value={group} onChange={(ev) => setGroup(ev.target.value)}>
                    <option value="">Tất cả nhóm</option>
                    {data.groups.map((g) => (
                      <option key={g} value={g}>
                        Nhóm {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </header>
            <div className="tb-table-wrap">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Golfer</th>
                    <th className="c-grp">Nhóm</th>
                    <th className="c-hcp">HCP</th>
                    <th className="num c-gross">Gross</th>
                    <th className="num">Net</th>
                    <th className="num">±Par</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.playerId} className={player?.id === r.playerId ? 'me' : ''}>
                      <td>
                        <span className={'tb-rank r' + (r.rank != null && r.rank <= 3 ? r.rank : 0)}>{r.rank ?? '–'}</span>
                      </td>
                      <td>
                        <span className="tb-who">
                          <span className="tb-av" aria-hidden="true">
                            {initials(r.name)}
                          </span>
                          <strong>{r.name}</strong>
                        </span>
                      </td>
                      <td className="c-grp">
                        <span className={'tb-grp g' + r.group}>{r.group}</span>
                      </td>
                      <td className="c-hcp">{hcpText(r.hcp10)}</td>
                      <td className="num c-gross">{r.gross ?? '–'}</td>
                      <td className="num">
                        <b>{r.net ?? '–'}</b>
                      </td>
                      <td className={'num tb-par ' + toneOfPar(r.toPar)}>{r.toPar == null ? '–' : toParText(r.toPar)}</td>
                    </tr>
                  ))}
                  {!data.rows.length && (
                    <tr>
                      <td colSpan={7} className="tb-empty">
                        Chưa có kết quả nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'rounds' && (
          <section className="tb-card tb-rounds">
            <h2>Vòng đấu</h2>
            {rounds.map((r) => (
              <article key={r.id}>
                <h3>
                  {r.name} <small>{r.holes} hố · Par {sumPars(r.pars)}</small>
                </h3>
                <Half start={0} pars={r.pars} holes={[]} />
                {r.holes === 18 && <Half start={9} pars={r.pars} holes={[]} />}
              </article>
            ))}
            {!rounds.length && <p className="tb-muted">Ban tổ chức chưa tạo vòng đấu.</p>}
          </section>
        )}

        {tab === 'mine' && (
          <section className="tb-card tb-mine">
            <h2>Kết quả của tôi</h2>
            {me?.signedOut ? (
              <p className="tb-muted">
                <a href="/tai-khoan">Đăng nhập hội viên</a> để xem thẻ điểm và nhập điểm thi đấu.
              </p>
            ) : !player ? (
              <p className="tb-muted">Bạn chưa có tên trong danh sách thi đấu của giải này. Hãy đăng ký hoặc liên hệ ban tổ chức.</p>
            ) : (
              <>
                {pending.length > 0 && <p className="tb-note">Có {pending.length} thẻ điểm đang chờ chủ cơ sở xác nhận.</p>}
                {(me?.cards ?? []).map((c) => {
                  const r = rounds.find((x) => x.id === c.roundId);
                  return r ? (
                    <article key={c.id}>
                      <h3>
                        {r.name}{' '}
                        <span className={'tb-status ' + c.status}>
                          {c.status === 'confirmed' ? 'Đã xác nhận' : c.status === 'pending' ? 'Chờ xác nhận' : c.status === 'rejected' ? 'Không duyệt' : 'Nháp'}
                        </span>
                      </h3>
                      {c.note && <p className="tb-muted">Ghi chú: {c.note}</p>}
                      <Half start={0} pars={r.pars} holes={c.holes} />
                      {r.holes === 18 && <Half start={9} pars={r.pars} holes={c.holes} />}
                    </article>
                  ) : null;
                })}
                {!(me?.cards ?? []).length && <p className="tb-muted">Bạn chưa có thẻ điểm nào. Bấm &ldquo;Nhập điểm thi đấu&rdquo;.</p>}
              </>
            )}
          </section>
        )}

        {tab === 'info' && (
          <section className="tb-card tb-info">
            <h2>Thông tin giải đấu</h2>
            {e.summary && <p>{e.summary}</p>}
            <p>
              <a className="tb-btn solid" href={postHref}>
                Xem thể thức, giải thưởng và đăng ký
              </a>
            </p>
          </section>
        )}

        <aside className="tb-side" aria-label="Thông tin của tôi">
          {player ? (
            <div className="tb-card tb-me">
              <div className="tb-me-top">
                <span className="tb-av big" aria-hidden="true">
                  {initials(player.name)}
                </span>
                <div>
                  <strong>{player.name}</strong>
                  <span className="tb-chip">
                    Nhóm {player.group} · HCP {hcpText(player.hcp10)}
                  </span>
                </div>
              </div>
              <div className="tb-me-stats">
                <div>
                  <small>Vị trí hiện tại</small>
                  <b>{me?.standing?.rank != null ? '#' + me.standing.rank : '–'}</b>
                </div>
                <div>
                  <small>Score (Net)</small>
                  <b>{me?.standing?.net ?? '–'}</b>
                </div>
                <div>
                  <small>±Par</small>
                  <b className={'tb-par ' + toneOfPar(me?.standing?.toPar ?? null)}>
                    {me?.standing?.toPar == null ? '–' : toParText(me.standing.toPar)}
                  </b>
                </div>
              </div>
            </div>
          ) : (
            <div className="tb-card tb-me">
              <strong>Kết quả của bạn</strong>
              <p className="tb-muted">
                {me?.signedOut === false || me?.verified != null
                  ? 'Bạn chưa có trong danh sách thi đấu của giải này.'
                  : 'Đăng nhập hội viên để xem thẻ điểm và nhập điểm.'}
              </p>
              {me?.signedOut && (
                <a className="tb-btn solid" href="/tai-khoan">
                  Đăng nhập
                </a>
              )}
            </div>
          )}

          {cardRound && cardHoles ? (
            <>
              {myCards.length > 1 && (
                <label className="tb-select">
                  Vòng
                  <select value={cardRound.id} onChange={(ev) => setShown(ev.target.value)}>
                    {myCards.map((c) => (
                      <option key={c.roundId} value={c.roundId}>
                        {rounds.find((r) => r.id === c.roundId)?.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <ScoreCard round={cardRound} holes={cardHoles} />
            </>
          ) : (
            player && (
              <div className="tb-card">
                <h3>Thẻ điểm của tôi</h3>
                <p className="tb-muted">Chưa có thẻ điểm đã xác nhận.</p>
              </div>
            )
          )}
        </aside>
      </div>

      {entry && me?.rounds && (
        <EntryDialog
          postId={postId}
          rounds={me.rounds}
          cards={me.cards ?? []}
          onClose={() => setEntry(false)}
          onSaved={() => void loadMe()}
        />
      )}
    </main>
  );
}
