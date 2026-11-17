'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Hourglass,
  ImagePlus,
  List,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { Post } from '../../lib/server/content-service';
import {
  STATUS_LABEL,
  composeBody,
  parseBody,
  tournamentStatus,
  type Sections,
  type TournamentStatus,
} from '../../lib/tournament';
import { askConfirm } from './kit';
import { TournamentScorePanel } from './TournamentScorePanel';
import { compressImage } from '../../lib/image-compress';
import '../tournament-admin.css';

/**
 * Quản trị giải đấu. A tournament is a post of kind "event" and tournament news is kind "news";
 * both are kept through /api/content (nothing new is stored). Format, prizes and conditions live as
 * labelled paragraphs inside the post body (see lib/tournament.ts).
 */
type Kind = 'news' | 'event';
type Draft = {
  id?: string;
  kind: Kind;
  title: string;
  summary: string;
  image: string;
  eventAt: string; // datetime-local value, Vietnam time
  place: string;
  status: 'draft' | 'published';
  sections: Sections;
};
type Signup = { id: string; name: string; phone: string; note: string; created: number };
type Tab = 'tournaments' | 'signups' | 'scores' | 'news';
type Filter = 'all' | TournamentStatus;
type EditorTab = 'general' | 'format' | 'prizes' | 'rules' | 'other';

const NO_SECTIONS: Sections = { other: '', format: '', prizes: '', rules: '' };
const emptyDraft = (kind: Kind): Draft => ({
  kind,
  title: '',
  summary: '',
  image: '',
  eventAt: '',
  place: '',
  status: 'draft',
  sections: { ...NO_SECTIONS },
});
const VN = 7 * 3_600_000;
const toLocal = (ms: number | null) =>
  ms == null ? '' : new Date(ms + VN).toISOString().slice(0, 16);
const fromLocal = (v: string) => (v ? Date.parse(v + ':00Z') - VN : null);
const fmt = (ms: number | null, o: Intl.DateTimeFormatOptions) =>
  ms == null ? '' : new Date(ms).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...o });
const dateOf = (ms: number | null) => fmt(ms, { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeOf = (ms: number | null) => fmt(ms, { hour: '2-digit', minute: '2-digit' });

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'live', label: 'Đang diễn ra' },
  { key: 'upcoming', label: 'Sắp diễn ra' },
  { key: 'ended', label: 'Đã kết thúc' },
  { key: 'draft', label: 'Bản nháp' },
];
const EDITOR_TABS: { key: EditorTab; label: string }[] = [
  { key: 'general', label: 'Thông tin chung' },
  { key: 'format', label: 'Thể thức' },
  { key: 'prizes', label: 'Giải thưởng' },
  { key: 'rules', label: 'Điều kiện' },
  { key: 'other', label: 'Khác' },
];

function toDraft(p: Post): Draft {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    summary: p.summary,
    image: p.image,
    eventAt: toLocal(p.event_at),
    place: p.place,
    status: p.status,
    sections: p.kind === 'event' ? parseBody(p.body) : { ...NO_SECTIONS, other: p.body },
  };
}

export function ContentPanel() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>('tournaments');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [draft, setDraft] = useState<Draft>(emptyDraft('event'));
  const [editorTab, setEditorTab] = useState<EditorTab>('general');
  const [editorOpen, setEditorOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [signupsFor, setSignupsFor] = useState('');
  const [signups, setSignups] = useState<Signup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/content', { cache: 'no-store' });
    const v = (await r.json()) as { posts?: Post[]; signups?: Record<string, number>; error?: string };
    if (!r.ok) setError(v.error || 'Không tải được danh sách');
    else {
      setPosts(v.posts ?? []);
      setCounts(v.signups ?? {});
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  const events = useMemo(
    () =>
      (posts ?? [])
        .filter((p) => p.kind === 'event')
        .sort((a, b) => (b.event_at ?? 0) - (a.event_at ?? 0)),
    [posts],
  );
  const news = useMemo(() => (posts ?? []).filter((p) => p.kind === 'news'), [posts]);
  const statusOf = useCallback((p: Post) => tournamentStatus(p, now), [now]);
  const tally = useMemo(() => {
    const t: Record<Filter, number> = { all: events.length, live: 0, upcoming: 0, ended: 0, draft: 0 };
    for (const p of events) t[statusOf(p)]++;
    return t;
  }, [events, statusOf]);

  const listKind: Kind = tab === 'news' ? 'news' : 'event';
  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi');
    const base = listKind === 'event' ? events : news;
    return base.filter((p) => {
      if (listKind === 'event' && filter !== 'all' && statusOf(p) !== filter) return false;
      if (!q) return true;
      return `${p.title} ${p.place}`.toLocaleLowerCase('vi').includes(q);
    });
  }, [events, news, listKind, filter, search, statusOf]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * pageSize, current * pageSize);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchSection = (k: keyof Sections, v: string) =>
    setDraft((d) => ({ ...d, sections: { ...d.sections, [k]: v } }));

  function startNew(kind: Kind = listKind) {
    setDraft(emptyDraft(kind));
    setEditorTab('general');
    setEditorOpen(true);
    setError('');
  }
  function edit(p: Post) {
    setDraft(toDraft(p));
    setEditorTab('general');
    setEditorOpen(true);
    setMenuId(null);
    setError('');
  }
  function copy(p: Post) {
    // A copy is a new draft in the editor; nothing is stored until it is saved.
    setDraft({ ...toDraft(p), id: undefined, title: `${p.title} (bản sao)`, status: 'draft' });
    setEditorTab('general');
    setEditorOpen(true);
    setMenuId(null);
    setError('');
    setMsg('Đã tạo bản sao ở dạng nháp; kiểm tra thông tin rồi bấm Lưu nháp.');
  }
  function cancel() {
    setDraft(emptyDraft(listKind));
    setEditorOpen(false);
    setError('');
  }

  async function call(body: Record<string, unknown>) {
    const r = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const v = (await r.json()) as { error?: string; signups?: Signup[] };
    if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
    return v;
  }

  async function save(status: 'draft' | 'published') {
    const d = draft;
    if (d.title.trim().length < 3) {
      setEditorTab('general');
      setError('Tên từ 3 ký tự trở lên');
      return;
    }
    if (d.kind === 'event' && !d.eventAt) {
      setEditorTab('general');
      setError('Giải đấu cần ngày giờ thi đấu');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await call({
        action: 'save',
        post: {
          id: d.id,
          kind: d.kind,
          title: d.title,
          summary: d.summary,
          body: d.kind === 'event' ? composeBody(d.sections) : d.sections.other,
          image: d.image,
          eventAt: d.kind === 'event' ? fromLocal(d.eventAt) : null,
          place: d.place,
          status,
        },
      });
      setMsg(status === 'published' ? 'Đã lưu và công bố lên trang công khai' : 'Đã lưu bản nháp');
      setDraft(emptyDraft(d.kind));
      setEditorOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Publish or take back to draft straight from the list; every other field is sent unchanged. */
  async function toggleStatus(p: Post) {
    const next = p.status === 'published' ? 'draft' : 'published';
    setBusy(true);
    setMenuId(null);
    try {
      await call({
        action: 'save',
        post: {
          id: p.id,
          kind: p.kind,
          title: p.title,
          summary: p.summary,
          body: p.body,
          image: p.image,
          eventAt: p.event_at,
          place: p.place,
          status: next,
        },
      });
      setMsg(next === 'published' ? 'Đã công bố' : 'Đã chuyển về bản nháp');
      if (draft.id === p.id) patch({ status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Post) {
    setMenuId(null);
    if (
      !(await askConfirm({
        title: `Xóa “${p.title}”?`,
        message:
          p.kind === 'event' && (counts[p.id] ?? 0) > 0
            ? `Giải này có ${counts[p.id]} lượt đăng ký; xóa giải sẽ bỏ khỏi trang công khai.`
            : 'Bài sẽ bị xóa khỏi hệ thống và trang công khai.',
        confirmLabel: 'Xóa',
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await call({ action: 'delete', id: p.id });
      setMsg('Đã xóa');
      if (draft.id === p.id) cancel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const optimized = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
      const form = new FormData();
      form.append('file', optimized);
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const v = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (!r.ok || !v.url) throw new Error(v.error || 'Tải ảnh thất bại');
      patch({ image: v.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function openSignups(id: string) {
    setSignupsFor(id);
    setSignups(null);
    if (!id) return;
    try {
      const v = await call({ action: 'signups', id });
      setSignups(v.signups ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const isEvent = draft.kind === 'event';
  const title = isEvent ? 'Giải đấu' : 'Tin tức';
  const kpis = [
    { key: 'all', label: 'Tổng số giải đấu', value: tally.all, icon: Trophy, tone: 'green' },
    { key: 'live', label: 'Đang diễn ra', value: tally.live, icon: CalendarDays, tone: 'blue' },
    { key: 'upcoming', label: 'Sắp diễn ra', value: tally.upcoming, icon: Hourglass, tone: 'amber' },
    { key: 'ended', label: 'Đã kết thúc', value: tally.ended, icon: CheckCircle2, tone: 'violet' },
  ] as const;

  return (
    <div className="ta">
      <header className="ta-head">
        <span className="ta-head-icon" aria-hidden="true">
          <Trophy size={26} />
        </span>
        <div>
          <h2>Quản trị giải đấu</h2>
          <p>Tạo, quản lý và theo dõi toàn bộ giải đấu Golf 3D</p>
        </div>
      </header>

      <nav className="ta-tabs" aria-label="Mục quản trị giải đấu">
        {(
          [
            ['tournaments', 'Danh sách giải đấu', List],
            ['signups', 'Đăng ký tham gia', Users],
            ['scores', 'Điểm & xếp hạng', Trophy],
            ['news', 'Tin tức', Newspaper],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'on' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => {
              setTab(key);
              setPage(1);
              setFilter('all');
              setSearch('');
              setMenuId(null);
              if (key !== 'signups') setDraft(emptyDraft(key === 'news' ? 'news' : 'event'));
              setEditorOpen(false);
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {(msg || error) && (
        <div className={'ta-banner' + (error ? ' bad' : '')} role={error ? 'alert' : 'status'}>
          <span>{error || msg}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => {
              setMsg('');
              setError('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {tab === 'scores' ? (
        <section className="ta-card">
          <TournamentScorePanel events={events.map((p) => ({ id: p.id, title: p.title }))} />
        </section>
      ) : tab === 'signups' ? (
        <section className="ta-card ta-signups">
          <h3>Đăng ký tham gia</h3>
          <label className="ta-field">
            <span>Chọn giải đấu</span>
            <select value={signupsFor} onChange={(e) => openSignups(e.target.value)}>
              <option value="">Chọn một giải đấu…</option>
              {events.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({counts[p.id] ?? 0} đăng ký)
                </option>
              ))}
            </select>
          </label>
          {!signupsFor && <p className="ta-empty">Chọn một giải đấu để xem danh sách đăng ký.</p>}
          {signupsFor && signups == null && <p className="ta-empty">Đang tải…</p>}
          {signups && signups.length === 0 && <p className="ta-empty">Chưa có ai đăng ký giải này.</p>}
          {signups && signups.length > 0 && (
            <ul className="ta-signup-list">
              {signups.map((s, i) => (
                <li key={s.id}>
                  <span className="ta-idx">{i + 1}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.phone}</small>
                    {s.note && <small>{s.note}</small>}
                  </div>
                  <time>{`${dateOf(s.created)} ${timeOf(s.created)}`}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {listKind === 'event' && (
            <div className="ta-kpis">
              {kpis.map(({ key, label, value, icon: Icon, tone }) => (
                <button
                  key={key}
                  type="button"
                  className={`ta-kpi tone-${tone}` + (filter === key ? ' on' : '')}
                  onClick={() => {
                    setFilter(key === 'all' ? 'all' : key);
                    setPage(1);
                  }}
                >
                  <span className="ta-kpi-icon" aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <span>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </span>
                </button>
              ))}
              <button type="button" className="ta-btn primary ta-new" onClick={() => startNew('event')}>
                <Plus size={20} /> Tạo giải đấu mới
              </button>
            </div>
          )}
          {listKind === 'news' && (
            <div className="ta-kpis ta-kpis--news">
              <button type="button" className="ta-btn primary ta-new" onClick={() => startNew('news')}>
                <Plus size={20} /> Viết tin mới
              </button>
            </div>
          )}

          <div className="ta-grid">
            <section className="ta-card ta-list" aria-label={`Danh sách ${title.toLocaleLowerCase('vi')}`}>
              <h3>{listKind === 'event' ? 'Danh sách giải đấu' : 'Danh sách tin tức'}</h3>
              <div className="ta-tools">
                {listKind === 'event' && (
                  <div className="ta-chips" role="group" aria-label="Lọc theo trạng thái">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={filter === f.key ? 'on' : ''}
                        onClick={() => {
                          setFilter(f.key);
                          setPage(1);
                        }}
                      >
                        {f.label} ({tally[f.key]})
                      </button>
                    ))}
                  </div>
                )}
                <label className="ta-search">
                  <Search size={18} aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={listKind === 'event' ? 'Tìm theo tên giải đấu…' : 'Tìm theo tiêu đề…'}
                    aria-label="Tìm kiếm"
                  />
                </label>
              </div>

              {posts == null ? (
                <p className="ta-empty">Đang tải…</p>
              ) : rows.length === 0 ? (
                <div className="ta-empty">
                  <Trophy size={36} aria-hidden="true" />
                  <p>
                    {(listKind === 'event' ? events : news).length === 0
                      ? listKind === 'event'
                        ? 'Chưa có giải đấu nào. Bấm “Tạo giải đấu mới” để bắt đầu.'
                        : 'Chưa có tin nào. Bấm “Viết tin mới” để bắt đầu.'
                      : 'Không có kết quả phù hợp bộ lọc.'}
                  </p>
                </div>
              ) : (
                <ul className="ta-rows">
                  <li className="ta-row ta-row--head" aria-hidden="true">
                    <span>#</span>
                    <span>{listKind === 'event' ? 'Giải đấu' : 'Tin tức'}</span>
                    <span>{listKind === 'event' ? 'Thời gian' : 'Ngày tạo'}</span>
                    <span>{listKind === 'event' ? 'Thể thức' : ''}</span>
                    <span>{listKind === 'event' ? 'Đăng ký' : ''}</span>
                    <span>Trạng thái</span>
                    <span>Thao tác</span>
                  </li>
                  {shown.map((p, i) => {
                    const st = p.kind === 'event' ? statusOf(p) : p.status === 'published' ? 'live' : 'draft';
                    const label = p.kind === 'event' ? STATUS_LABEL[st] : p.status === 'published' ? 'Đã đăng' : 'Bản nháp';
                    const format = p.kind === 'event' ? parseBody(p.body).format.split('\n')[0] : '';
                    return (
                      <li key={p.id} className={'ta-row' + (draft.id === p.id ? ' sel' : '')}>
                        <span className="ta-idx">{(current - 1) * pageSize + i + 1}</span>
                        <div className="ta-name">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" width={64} height={44} />
                          ) : (
                            <span className="ta-thumb" aria-hidden="true">
                              <Trophy size={20} />
                            </span>
                          )}
                          <div>
                            <strong>{p.title}</strong>
                            {p.place && <small>{p.place}</small>}
                          </div>
                        </div>
                        <div className="ta-when">
                          <CalendarDays size={15} aria-hidden="true" />
                          <span>
                            {dateOf(p.kind === 'event' ? p.event_at : p.created)}
                            {p.kind === 'event' && <small>{timeOf(p.event_at)}</small>}
                          </span>
                        </div>
                        <div className="ta-format">{p.kind === 'event' ? <span>{format || '—'}</span> : null}</div>
                        <div className="ta-reg">
                          {p.kind === 'event' && (
                            <>
                              <Users size={15} aria-hidden="true" />
                              <strong>{counts[p.id] ?? 0}</strong>
                            </>
                          )}
                        </div>
                        <div>
                          <span className={`ta-pill ${st}`}>{label}</span>
                        </div>
                        <div className="ta-actions">
                          <button type="button" aria-label={`Sửa ${p.title}`} title="Sửa" onClick={() => edit(p)}>
                            <Pencil size={18} />
                          </button>
                          <button type="button" aria-label={`Sao chép ${p.title}`} title="Sao chép" onClick={() => copy(p)}>
                            <Copy size={18} />
                          </button>
                          <div className="ta-more">
                            <button
                              type="button"
                              aria-label="Thêm thao tác"
                              aria-expanded={menuId === p.id}
                              title="Thêm"
                              onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            {menuId === p.id && (
                              <>
                                <button
                                  type="button"
                                  className="ta-menu-backdrop"
                                  aria-label="Đóng menu"
                                  onClick={() => setMenuId(null)}
                                />
                                <div className="ta-menu" role="menu">
                                  <button type="button" role="menuitem" disabled={busy} onClick={() => toggleStatus(p)}>
                                    {p.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                                    {p.status === 'published' ? 'Chuyển về bản nháp' : 'Công bố'}
                                  </button>
                                  {p.kind === 'event' && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setMenuId(null);
                                        setTab('signups');
                                        openSignups(p.id);
                                      }}
                                    >
                                      <Users size={16} /> Xem đăng ký
                                    </button>
                                  )}
                                  <button type="button" role="menuitem" className="danger" disabled={busy} onClick={() => remove(p)}>
                                    <Trash2 size={16} /> Xóa
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {rows.length > 0 && (
                <div className="ta-pager">
                  <label>
                    Hiển thị
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n} / trang
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ta-pages" role="navigation" aria-label="Phân trang">
                    <button type="button" aria-label="Trang trước" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: pages }, (_, n) => n + 1)
                      .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1)
                      .map((n, idx, all) => (
                        <span key={n} className="ta-page-wrap">
                          {idx > 0 && n - all[idx - 1] > 1 && <span aria-hidden="true">…</span>}
                          <button type="button" className={n === current ? 'on' : ''} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)}>
                            {n}
                          </button>
                        </span>
                      ))}
                    <button type="button" aria-label="Trang sau" disabled={current >= pages} onClick={() => setPage(current + 1)}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className={'ta-card ta-editor' + (editorOpen ? ' open' : '')} aria-label="Tạo hoặc chỉnh sửa">
              <div className="ta-editor-head">
                <h3>
                  <Pencil size={20} aria-hidden="true" />
                  {draft.id ? `Chỉnh sửa ${isEvent ? 'giải đấu' : 'tin'}` : isEvent ? 'Tạo giải đấu' : 'Viết tin mới'}
                </h3>
                <button type="button" className="ta-close" aria-label="Đóng" onClick={cancel}>
                  <X size={20} />
                </button>
              </div>

              {isEvent && (
                <div className="ta-etabs" role="tablist" aria-label="Nhóm thông tin">
                  {EDITOR_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={editorTab === t.key}
                      className={editorTab === t.key ? 'on' : ''}
                      onClick={() => setEditorTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="ta-form">
                {(editorTab === 'general' || !isEvent) && (
                  <>
                    <label className="ta-field">
                      <span>
                        {isEvent ? 'Tên giải đấu' : 'Tiêu đề'} <b>*</b>
                      </span>
                      <input
                        value={draft.title}
                        maxLength={140}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder={isEvent ? 'Nhập tên giải đấu…' : 'Nhập tiêu đề…'}
                      />
                    </label>
                    <label className="ta-field">
                      <span>Mô tả</span>
                      <textarea
                        rows={3}
                        maxLength={300}
                        value={draft.summary}
                        onChange={(e) => patch({ summary: e.target.value })}
                        placeholder="Nhập mô tả ngắn về giải đấu, mục tiêu, đối tượng tham gia…"
                      />
                    </label>
                    {isEvent && (
                      <div className="ta-two">
                        <label className="ta-field">
                          <span>
                            Thời gian thi đấu <b>*</b>
                          </span>
                          <input type="datetime-local" value={draft.eventAt} onChange={(e) => patch({ eventAt: e.target.value })} />
                        </label>
                        <label className="ta-field">
                          <span>Địa điểm</span>
                          <input
                            value={draft.place}
                            maxLength={160}
                            onChange={(e) => patch({ place: e.target.value })}
                            placeholder="Nhập địa điểm…"
                          />
                        </label>
                      </div>
                    )}
                    {!isEvent && (
                      <label className="ta-field">
                        <span>Nội dung</span>
                        <textarea
                          rows={8}
                          maxLength={8000}
                          value={draft.sections.other}
                          onChange={(e) => patchSection('other', e.target.value)}
                          placeholder="Nội dung bài viết. Dòng trống tách đoạn."
                        />
                      </label>
                    )}
                    <div className="ta-media">
                      <div className="ta-field">
                        <span>Hình ảnh đại diện</span>
                        {draft.image ? (
                          <div className="ta-preview">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={draft.image} alt="Ảnh đại diện" />
                            <button type="button" className="ta-btn" onClick={() => patch({ image: '' })}>
                              <Trash2 size={16} /> Bỏ ảnh
                            </button>
                          </div>
                        ) : (
                          <label className="ta-drop">
                            <ImagePlus size={30} aria-hidden="true" />
                            <b>Tải lên hình ảnh</b>
                            <small>JPG, PNG hoặc WebP</small>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={busy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) upload(f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <div className="ta-field">
                        <span>Trạng thái</span>
                        <span className={`ta-pill ta-state ${draft.status === 'published' ? 'live' : 'draft'}`}>
                          {draft.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
                        </span>
                        <small className="ta-hint">
                          {isEvent
                            ? 'Lưu nháp để giữ riêng; Lưu & Công bố để hiện trên trang công khai và nhận đăng ký khi giải chưa diễn ra.'
                            : 'Lưu nháp để giữ riêng; Lưu & Công bố để đăng lên trang tin tức.'}
                        </small>
                      </div>
                    </div>
                  </>
                )}
                {isEvent && editorTab !== 'general' && (
                  <label className="ta-field">
                    <span>{EDITOR_TABS.find((t) => t.key === editorTab)!.label}</span>
                    <textarea
                      rows={10}
                      value={draft.sections[editorTab]}
                      onChange={(e) => patchSection(editorTab, e.target.value)}
                      placeholder={
                        editorTab === 'format'
                          ? 'VD: Stroke Play 18 hố, chia bảng theo handicap…'
                          : editorTab === 'prizes'
                            ? 'Mô tả cơ cấu giải thưởng…'
                            : editorTab === 'rules'
                              ? 'Điều kiện tham dự, handicap, trang phục…'
                              : 'Thông tin khác về giải đấu…'
                      }
                    />
                  </label>
                )}
              </div>

              <div className="ta-editor-foot">
                <button type="button" className="ta-btn" disabled={busy} onClick={cancel}>
                  Hủy
                </button>
                <button type="button" className="ta-btn" disabled={busy} onClick={() => save('draft')}>
                  <Save size={18} /> Lưu nháp
                </button>
                <button type="button" className="ta-btn primary" disabled={busy} onClick={() => save('published')}>
                  <CheckCircle2 size={18} /> Lưu &amp; Công bố
                </button>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
