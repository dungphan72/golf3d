'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Crown,
  Edit3,
  ImagePlus,
  MapPin,
  Medal,
  Newspaper,
  Phone,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { Post } from '../../lib/server/content-service';
import { askConfirm } from './kit';

type Draft = {
  id?: string;
  kind: 'news' | 'event';
  title: string;
  summary: string;
  body: string;
  image: string;
  eventAt: string; // datetime-local value, Vietnam time
  place: string;
  status: 'draft' | 'published';
};

type LeaderboardRow = {
  id: string;
  rank: number;
  golfer: string;
  memberCode: string;
  flight: 'Bảng A (HDC 0–12)' | 'Bảng B (HDC 13–24)' | 'Bảng Lady / VIP';
  gross: number;
  handicap: number;
  net: number;
  thru: string;
  prize: string;
};

const INITIAL_LEADERBOARD: LeaderboardRow[] = [
  {
    id: 'lb-1',
    rank: 1,
    golfer: 'Nguyễn Hoàng Long',
    memberCode: 'HV-GD-0023',
    flight: 'Bảng A (HDC 0–12)',
    gross: 71,
    handicap: 4,
    net: 67,
    thru: 'F (18 hố)',
    prize: 'Best Gross · Cúp Vàng + 20 giờ VIP',
  },
  {
    id: 'lb-2',
    rank: 2,
    golfer: 'Kim Min Joon',
    memberCode: 'HV-VP-0005',
    flight: 'Bảng A (HDC 0–12)',
    gross: 73,
    handicap: 5,
    net: 68,
    thru: 'F (18 hố)',
    prize: 'Nhất Bảng A · 15 giờ VIP',
  },
  {
    id: 'lb-3',
    rank: 3,
    golfer: 'Trần Minh Anh',
    memberCode: 'HV-PL-0012',
    flight: 'Bảng Lady / VIP',
    gross: 78,
    handicap: 9,
    net: 69,
    thru: 'F (18 hố)',
    prize: 'Best Lady · Voucher Proshop 5.000.000đ',
  },
  {
    id: 'lb-4',
    rank: 4,
    golfer: 'Vũ Đức Thành',
    memberCode: 'HV-GD-0088',
    flight: 'Bảng B (HDC 13–24)',
    gross: 84,
    handicap: 14,
    net: 70,
    thru: 'F (18 hố)',
    prize: 'Nhất Bảng B · 10 giờ Tiêu chuẩn',
  },
  {
    id: 'lb-5',
    rank: 5,
    golfer: 'Lê Quốc Bảo',
    memberCode: 'HV-SV-0104',
    flight: 'Bảng B (HDC 13–24)',
    gross: 88,
    handicap: 16,
    net: 72,
    thru: 'F (18 hố)',
    prize: 'Nearest to the Pin (Hố #7)',
  },
];

const EMPTY: Draft = {
  kind: 'event',
  title: '',
  summary: '',
  body: '',
  image: '',
  eventAt: '',
  place: 'Saigon Indoor Golf Club – 250 Lương Định Của',
  status: 'published',
};
const VN = 7 * 3_600_000;
const toLocal = (ms: number | null) =>
  ms == null ? '' : new Date(ms + VN).toISOString().slice(0, 16);
const fromLocal = (v: string) => (v ? Date.parse(v + ':00Z') - VN : null);
const when = (ms: number | null) =>
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

/** Màn hình Quản lý Giải đấu (Tournament), Bảng xếp hạng & Tin tức CLB theo chuẩn thiết kế mới. */
export function ContentPanel() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [signups, setSignups] = useState<
    { id: string; name: string; phone: string; note: string; created: number }[] | null
  >(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'all' | 'tournaments' | 'leaderboard' | 'news'>('all');
  const [search, setSearch] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>(INITIAL_LEADERBOARD);
  const [flightFilter, setFlightFilter] = useState<string>('all');
  const [showAddScore, setShowAddScore] = useState(false);
  const [scoreForm, setScoreForm] = useState({
    golfer: '',
    memberCode: '',
    flight: 'Bảng A (HDC 0–12)' as LeaderboardRow['flight'],
    gross: 76,
    handicap: 6,
    prize: '',
  });

  const load = useCallback(async () => {
    const r = await fetch('/api/content', { cache: 'no-store' });
    const v = (await r.json()) as {
      posts?: Post[];
      signups?: Record<string, number>;
      error?: string;
    };
    if (!r.ok) setError(v.error || 'Không tải được danh sách');
    else {
      setPosts(v.posts ?? []);
      setCounts(v.signups ?? {});
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  const edit = (p: Post) => {
    setSignups(null);
    setDraft({
      id: p.id,
      kind: p.kind,
      title: p.title,
      summary: p.summary,
      body: p.body,
      image: p.image,
      eventAt: toLocal(p.event_at),
      place: p.place,
      status: p.status,
    });
  };

  async function showSignups(id: string) {
    const r = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signups', id }),
    });
    const v = (await r.json()) as { signups?: typeof signups; error?: string };
    if (!r.ok) setError(v.error || 'Không tải được danh sách đăng ký');
    else setSignups(v.signups ?? []);
  }

  async function call(body: Record<string, unknown>) {
    const r = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const v = (await r.json()) as { error?: string };
    if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      await call({
        action: 'save',
        post: {
          id: draft.id,
          kind: draft.kind,
          title: draft.title,
          summary: draft.summary,
          body: draft.body,
          image: draft.image,
          eventAt: draft.kind === 'event' ? fromLocal(draft.eventAt) : null,
          place: draft.place,
          status: draft.status,
        },
      });
      setMsg(
        draft.status === 'published'
          ? 'Đã lưu và đăng lên trang công khai'
          : 'Đã lưu bản nháp',
      );
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Post) {
    if (!(await askConfirm({ title: `Xóa “${p.title}”?`, confirmLabel: 'Xóa bài' }))) return;
    setBusy(true);
    try {
      await call({ action: 'delete', id: p.id });
      setMsg('Đã xóa');
      if (draft?.id === p.id) setDraft(null);
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
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const v = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (!r.ok || !v.url) throw new Error(v.error || 'Tải ảnh thất bại');
      setDraft((d) => (d ? { ...d, image: v.url! } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleAddLeaderboardScore(e: React.FormEvent) {
    e.preventDefault();
    if (!scoreForm.golfer.trim()) return;
    const net = scoreForm.gross - scoreForm.handicap;
    const nextList = [
      ...leaderboard,
      {
        id: 'lb-' + crypto.randomUUID(),
        rank: leaderboard.length + 1,
        golfer: scoreForm.golfer.trim(),
        memberCode: scoreForm.memberCode.trim() || 'KH-GUEST',
        flight: scoreForm.flight,
        gross: Number(scoreForm.gross),
        handicap: Number(scoreForm.handicap),
        net,
        thru: 'F (18 hố)',
        prize: scoreForm.prize.trim() || '—',
      },
    ]
      .sort((a, b) => a.net - b.net)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
    setLeaderboard(nextList);
    setShowAddScore(false);
    setScoreForm({
      golfer: '',
      memberCode: '',
      flight: 'Bảng A (HDC 0–12)',
      gross: 76,
      handicap: 6,
      prize: '',
    });
    setMsg('Đã cập nhật kết quả thi đấu lên Bảng xếp hạng!');
  }

  const allPosts = posts ?? [];
  const eventsCount = allPosts.filter((p) => p.kind === 'event').length;
  const newsCount = allPosts.filter((p) => p.kind === 'news').length;
  const totalSignups = Object.values(counts).reduce((a, b) => a + b, 0);

  const visiblePosts = allPosts.filter((p) => {
    if (activeTab === 'tournaments' && p.kind !== 'event') return false;
    if (activeTab === 'news' && p.kind !== 'news') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredLeaderboard = leaderboard.filter(
    (r) => flightFilter === 'all' || r.flight === flightFilter,
  );

  return (
    <div className="mod-workspace pos-content">
      {/* Page Header */}
      <div className="mod-page-header">
        <div className="mod-page-title-group">
          <div className="mod-page-icon amber">
            <Trophy size={22} />
          </div>
          <div>
            <h2>Giải đấu (Tournament) & Sự kiện CLB</h2>
            <p>
              Tổ chức giải đấu Golf 3D, quản lý đăng ký vận động viên, bảng xếp hạng điểm Net/Gross và
              bản tin công khai
            </p>
          </div>
        </div>
        <div className="mod-page-actions">
          <button
            type="button"
            className="mod-btn-outline"
            onClick={() => {
              setActiveTab('leaderboard');
              setShowAddScore(true);
            }}
          >
            <Medal size={16} />
            <span>Nhập điểm VĐV</span>
          </button>
          <button
            type="button"
            className="mod-btn-primary primary"
            onClick={() =>
              setDraft({
                ...EMPTY,
                kind: activeTab === 'news' ? 'news' : 'event',
              })
            }
          >
            <Plus size={16} />
            <span>Thêm bài / Giải đấu</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="mod-kpi-strip">
        <div className="mod-kpi-card">
          <div className="mod-kpi-icon amber">
            <Trophy size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Giải đấu & Sự kiện</span>
            <div className="mod-kpi-val-row">
              <strong>{eventsCount}</strong>
              <span className="mod-kpi-sub">giải đã khởi tạo</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon green">
            <Users size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Golfer đăng ký tham gia</span>
            <div className="mod-kpi-val-row">
              <strong className="text-green">{totalSignups}</strong>
              <span className="mod-kpi-sub">lượt đăng ký trực tuyến</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon blue">
            <Award size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Dẫn đầu Best Gross</span>
            <div className="mod-kpi-val-row">
              <strong>{leaderboard[0]?.gross ?? 71} gậy</strong>
              <span className="mod-kpi-sub">{leaderboard[0]?.golfer}</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon purple">
            <Newspaper size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Tin tức & Thông báo</span>
            <div className="mod-kpi-val-row">
              <strong>{newsCount}</strong>
              <span className="mod-kpi-sub">bài viết trên trang chủ</span>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="mod-info-banner" role="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {msg}
          </span>
          <button type="button" className="mod-btn-outline sm" onClick={() => setMsg('')}>
            Đóng
          </button>
        </div>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {/* Pill Navigation Tabs */}
      <div className="mod-pill-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`mod-pill-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Trophy size={15} />
          <span>Tất cả bài & Giải đấu ({allPosts.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tournaments'}
          className={`mod-pill-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          <Crown size={15} />
          <span>Giải đấu & Sự kiện ({eventsCount})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'leaderboard'}
          className={`mod-pill-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Medal size={15} />
          <span>Bảng xếp hạng Live ({leaderboard.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'news'}
          className={`mod-pill-tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <Newspaper size={15} />
          <span>Tin tức CLB ({newsCount})</span>
        </button>
      </div>

      {/* TAB: LEADERBOARD */}
      {activeTab === 'leaderboard' ? (
        <div className="mod-surface-card mod-section-body">
          <div className="mod-toolbar">
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Bảng xếp hạng Giải vô địch Saigon Indoor Golf Championship
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                Thể thức Stroke Play 18 hố (Hệ thống Golfzon Vision Plus) · Tính điểm Net theo Handicap
              </p>
            </div>
            <div className="mod-chip-group">
              {[
                { key: 'all', label: 'Tất cả bảng' },
                { key: 'Bảng A (HDC 0–12)', label: 'Bảng A (0–12)' },
                { key: 'Bảng B (HDC 13–24)', label: 'Bảng B (13–24)' },
                { key: 'Bảng Lady / VIP', label: 'Bảng Lady / VIP' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`mod-filter-chip ${flightFilter === f.key ? 'active' : ''}`}
                  onClick={() => setFlightFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                className="mod-btn-primary sm"
                onClick={() => setShowAddScore(!showAddScore)}
              >
                <Plus size={14} /> Cập nhật điểm Golfer
              </button>
            </div>
          </div>

          {showAddScore && (
            <form className="mod-inline-form" onSubmit={handleAddLeaderboardScore}>
              <div className="mod-form-grid-4">
                <label className="mod-field">
                  <span>Họ tên Golfer *</span>
                  <input
                    required
                    placeholder="VD: Phạm Quốc Anh"
                    value={scoreForm.golfer}
                    onChange={(e) => setScoreForm({ ...scoreForm, golfer: e.target.value })}
                  />
                </label>
                <label className="mod-field">
                  <span>Mã Hội viên</span>
                  <input
                    placeholder="VD: HV-GD-0092"
                    value={scoreForm.memberCode}
                    onChange={(e) => setScoreForm({ ...scoreForm, memberCode: e.target.value })}
                  />
                </label>
                <label className="mod-field">
                  <span>Bảng đấu</span>
                  <select
                    value={scoreForm.flight}
                    onChange={(e) =>
                      setScoreForm({
                        ...scoreForm,
                        flight: e.target.value as LeaderboardRow['flight'],
                      })
                    }
                  >
                    <option value="Bảng A (HDC 0–12)">Bảng A (HDC 0–12)</option>
                    <option value="Bảng B (HDC 13–24)">Bảng B (HDC 13–24)</option>
                    <option value="Bảng Lady / VIP">Bảng Lady / VIP</option>
                  </select>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="mod-field">
                    <span>Điểm Gross</span>
                    <input
                      type="number"
                      min={54}
                      max={150}
                      value={scoreForm.gross}
                      onChange={(e) =>
                        setScoreForm({ ...scoreForm, gross: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="mod-field">
                    <span>Handicap</span>
                    <input
                      type="number"
                      min={0}
                      max={36}
                      value={scoreForm.handicap}
                      onChange={(e) =>
                        setScoreForm({ ...scoreForm, handicap: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <input
                  style={{ flex: 1, maxWidth: 420 }}
                  className="mod-input"
                  placeholder="Giải thưởng / Danh hiệu (VD: Longest Drive Hố #12)"
                  value={scoreForm.prize}
                  onChange={(e) => setScoreForm({ ...scoreForm, prize: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="mod-btn-outline sm"
                    onClick={() => setShowAddScore(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="mod-btn-primary sm">
                    Lưu lên Bảng xếp hạng
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Vận động viên (Golfer)</th>
                  <th>Bảng đấu (Flight)</th>
                  <th className="num">Gross</th>
                  <th className="num">HDC</th>
                  <th className="num">Net</th>
                  <th>Tiến độ</th>
                  <th>Giải thưởng / Thành tích</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span
                        className={`mod-rank-badge ${
                          row.rank === 1
                            ? 'gold'
                            : row.rank === 2
                              ? 'silver'
                              : row.rank === 3
                                ? 'bronze'
                                : ''
                        }`}
                      >
                        #{row.rank}
                      </span>
                    </td>
                    <td>
                      <strong>{row.golfer}</strong>
                      <small style={{ display: 'block', color: '#64748b' }}>
                        Mã: {row.memberCode}
                      </small>
                    </td>
                    <td>
                      <span className="mod-tag">{row.flight}</span>
                    </td>
                    <td className="num">
                      <strong>{row.gross}</strong>
                    </td>
                    <td className="num">{row.handicap}</td>
                    <td className="num">
                      <strong className="text-green" style={{ fontSize: 15 }}>
                        {row.net}
                      </strong>
                    </td>
                    <td>{row.thru}</td>
                    <td>
                      <span style={{ color: '#b45309', fontWeight: 600, fontSize: 13 }}>
                        {row.prize}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB: ALL / TOURNAMENTS / NEWS */
        <div className="pos-content-grid">
          <section className="mod-surface-card mod-section-body" aria-label="Danh sách bài viết">
            <div className="mod-toolbar" style={{ marginBottom: 12 }}>
              <div className="mod-search-input" style={{ flex: 1 }}>
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Tìm kiếm giải đấu, sự kiện hoặc tin tức…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {posts === null ? (
              <p className="form-note">Đang tải…</p>
            ) : visiblePosts.length === 0 ? (
              <div className="mod-empty-state">
                <Trophy size={36} className="text-emerald" />
                <h4>Chưa có bài viết hoặc giải đấu nào</h4>
                <p>
                  Bấm <strong>“Thêm bài / Giải đấu”</strong> ở góc phải trên để tạo giải đấu hoặc viết
                  bản tin đầu tiên.
                </p>
              </div>
            ) : (
              <ul className="pos-content-list">
                {visiblePosts.map((p) => (
                  <li key={p.id} className={draft?.id === p.id ? 'on' : ''}>
                    <button type="button" onClick={() => edit(p)}>
                      <i className={'pos-kind ' + p.kind}>
                        {p.kind === 'event' ? <Trophy size={18} /> : <Newspaper size={18} />}
                      </i>
                      <span>
                        <strong>{p.title}</strong>
                        <small>
                          {p.kind === 'event'
                            ? `Diễn ra ${when(p.event_at)} · ${counts[p.id] ?? 0} VĐV đăng ký`
                            : `Đăng lúc ${when(p.created)}`}
                        </small>
                        {p.place && p.kind === 'event' && (
                          <small style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MapPin size={11} /> {p.place}
                          </small>
                        )}
                      </span>
                      <em className={'pos-status-pill ' + p.status}>
                        {p.status === 'published' ? 'Đã đăng' : 'Nháp'}
                      </em>
                    </button>
                    <button
                      type="button"
                      className="pos-content-del"
                      aria-label={`Xóa ${p.title}`}
                      onClick={() => remove(p)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {draft ? (
            <section
              className="pos-content-form mod-surface-card mod-section-body"
              aria-label="Soạn bài"
            >
              <div className="mod-box-head">
                <h3>
                  <Edit3 size={16} />{' '}
                  {draft.id ? 'Chỉnh sửa nội dung' : 'Tạo Giải đấu / Bài viết mới'}
                </h3>
                <button
                  type="button"
                  className="mod-icon-close"
                  onClick={() => setDraft(null)}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="pos-seg" role="radiogroup" aria-label="Loại bài">
                {(
                  [
                    ['event', 'Sự kiện / giải đấu'],
                    ['news', 'Tin tức'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={draft.kind === key}
                    className={draft.kind === key ? 'on' : ''}
                    onClick={() => setDraft({ ...draft, kind: key })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label>
                Tiêu đề
                <input
                  value={draft.title}
                  maxLength={140}
                  placeholder="VD: Giải Saigon Indoor Golf Championship Mùa Thu 2026"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              {draft.kind === 'event' && (
                <div className="form-grid">
                  <label>
                    Ngày giờ diễn ra
                    <input
                      type="datetime-local"
                      value={draft.eventAt}
                      onChange={(e) => setDraft({ ...draft, eventAt: e.target.value })}
                    />
                  </label>
                  <label>
                    Địa điểm
                    <input
                      value={draft.place}
                      maxLength={160}
                      onChange={(e) => setDraft({ ...draft, place: e.target.value })}
                    />
                  </label>
                </div>
              )}
              <label>
                Tóm tắt (hiện ở danh sách)
                <textarea
                  rows={2}
                  maxLength={300}
                  value={draft.summary}
                  placeholder="Tóm tắt thể thức thi đấu, cơ cấu giải thưởng hoặc nội dung chính…"
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                />
              </label>
              <label>
                Nội dung (xuống dòng để tách đoạn)
                <textarea
                  rows={7}
                  maxLength={8000}
                  value={draft.body}
                  placeholder="Chi tiết điều lệ giải đấu, lịch trình Tee-off, quy định Handicap và giải thưởng…"
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </label>
              <div className="pos-content-image">
                {draft.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.image} alt="" width={160} height={100} />
                ) : (
                  <span className="pos-content-noimg">
                    <ImagePlus size={22} /> Chưa có ảnh bìa
                  </span>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="mod-btn-outline sm pos-upload" style={{ cursor: 'pointer' }}>
                    Chọn ảnh JPG, PNG, WebP
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {draft.image && (
                    <button
                      type="button"
                      className="mod-btn-outline sm"
                      onClick={() => setDraft({ ...draft, image: '' })}
                    >
                      Bỏ ảnh
                    </button>
                  )}
                </div>
              </div>
              <label>
                Trạng thái hiển thị
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as Draft['status'] })
                  }
                >
                  <option value="draft">Bản nháp (chưa hiện công khai)</option>
                  <option value="published">Đăng lên trang công khai</option>
                </select>
              </label>
              {draft.id && draft.kind === 'event' && (
                <div className="pos-signups">
                  <button
                    type="button"
                    className="mod-btn-outline sm"
                    onClick={() => showSignups(draft.id!)}
                  >
                    <Users size={14} /> Xem danh sách đăng ký ({counts[draft.id] ?? 0})
                  </button>
                  {signups && (
                    <table className="ds-table" style={{ marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>Họ tên VĐV</th>
                          <th>Điện thoại</th>
                          <th>Ghi chú / HDC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signups.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.name}</strong>
                            </td>
                            <td>
                              <a
                                href={`tel:${s.phone.replace(/[^0-9+]/g, '')}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <Phone size={12} /> {s.phone}
                              </a>
                            </td>
                            <td>{s.note || '—'}</td>
                          </tr>
                        ))}
                        {!signups.length && (
                          <tr>
                            <td colSpan={3}>Chưa có VĐV nào đăng ký.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              <div className="pos-content-actions">
                <button
                  type="button"
                  className="mod-btn-primary primary"
                  disabled={busy}
                  onClick={save}
                >
                  {busy ? 'Đang lưu…' : 'Lưu bài'}
                </button>
                <button
                  type="button"
                  className="mod-btn-outline secondary"
                  disabled={busy}
                  onClick={() => setDraft(null)}
                >
                  Đóng
                </button>
                {draft.eventAt && draft.kind === 'event' && (
                  <span className="form-note">
                    <CalendarDays size={14} /> {when(fromLocal(draft.eventAt))}
                  </span>
                )}
              </div>
            </section>
          ) : (
            <aside className="mod-surface-card mod-section-body">
              <div className="mod-box-head">
                <h3>
                  <Trophy size={16} className="text-amber" /> Tổng quan Giải đấu & Bảng vinh danh
                </h3>
                <button
                  type="button"
                  className="mod-btn-outline sm"
                  onClick={() => setActiveTab('leaderboard')}
                >
                  Xem Bảng xếp hạng
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>
                Chọn một giải đấu bên trái để chỉnh sửa điều lệ và xem danh sách Golfer đăng ký, hoặc
                bấm <strong>Thêm bài / Giải đấu</strong> để phát hành sự kiện mới.
              </p>

              <div className="mod-mini-leaderboard">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#334155' }}>
                  Top 3 Golfer dẫn đầu (Best Net)
                </h4>
                {leaderboard.slice(0, 3).map((item) => (
                  <div key={item.id} className="mod-mini-lb-row">
                    <span
                      className={`mod-rank-badge ${
                        item.rank === 1 ? 'gold' : item.rank === 2 ? 'silver' : 'bronze'
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: 13.5, color: '#0f172a' }}>
                        {item.golfer}
                      </strong>
                      <small style={{ color: '#64748b', fontSize: 12 }}>
                        {item.flight} · {item.prize}
                      </small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong className="text-green" style={{ fontSize: 14 }}>
                        Net {item.net}
                      </strong>
                      <small style={{ display: 'block', color: '#64748b', fontSize: 11 }}>
                        Gross {item.gross} (HDC {item.handicap})
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
