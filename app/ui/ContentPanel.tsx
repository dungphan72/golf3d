'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ImagePlus, Newspaper, Plus, Trash2, Trophy } from 'lucide-react';
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

const EMPTY: Draft = { kind: 'news', title: '', summary: '', body: '', image: '', eventAt: '', place: '', status: 'draft' };
const VN = 7 * 3_600_000;
const toLocal = (ms: number | null) => (ms == null ? '' : new Date(ms + VN).toISOString().slice(0, 16));
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

/** Staff screen for news and events (tournaments). Published items show on the public site. */
export function ContentPanel() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [signups, setSignups] = useState<{ id: string; name: string; phone: string; note: string; created: number }[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
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
      setMsg(draft.status === 'published' ? 'Đã lưu và đăng lên trang công khai' : 'Đã lưu bản nháp');
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

  return (
    <div className="pos-content">
      <header className="pos-content-head">
        <div>
          <h2>Tin tức &amp; sự kiện</h2>
          <p>Bài đã đăng hiện ở trang chủ và mục Tin tức. Bản nháp chỉ nhân viên thấy.</p>
        </div>
        <button type="button" className="primary" onClick={() => setDraft({ ...EMPTY })}>
          <Plus size={18} /> Thêm bài
        </button>
      </header>
      {msg && (
        <div className="info-strip" role="status">
          {msg}
        </div>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="pos-content-grid">
        <section aria-label="Danh sách bài viết">
          {posts === null ? (
            <p className="form-note">Đang tải…</p>
          ) : posts.length === 0 ? (
            <p className="pos-empty-note">Chưa có bài nào. Bấm “Thêm bài” để viết tin hoặc tạo sự kiện đầu tiên.</p>
          ) : (
            <ul className="pos-content-list">
              {posts.map((p) => (
                <li key={p.id} className={draft?.id === p.id ? 'on' : ''}>
                  <button type="button" onClick={() => edit(p)}>
                    <i className={'pos-kind ' + p.kind}>{p.kind === 'event' ? <Trophy size={18} /> : <Newspaper size={18} />}</i>
                    <span>
                      <strong>{p.title}</strong>
                      <small>
                        {p.kind === 'event'
                          ? `Diễn ra ${when(p.event_at)} · ${counts[p.id] ?? 0} đăng ký`
                          : `Viết ${when(p.created)}`}
                      </small>
                    </span>
                    <em className={'pos-status-pill ' + p.status}>{p.status === 'published' ? 'Đã đăng' : 'Nháp'}</em>
                  </button>
                  <button type="button" className="pos-content-del" aria-label={`Xóa ${p.title}`} onClick={() => remove(p)}>
                    <Trash2 size={17} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {draft && (
          <section className="pos-content-form" aria-label="Soạn bài">
            <div className="pos-seg" role="radiogroup" aria-label="Loại bài">
              {(
                [
                  ['news', 'Tin tức'],
                  ['event', 'Sự kiện / giải đấu'],
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
              <input value={draft.title} maxLength={140} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
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
                  <input value={draft.place} maxLength={160} onChange={(e) => setDraft({ ...draft, place: e.target.value })} />
                </label>
              </div>
            )}
            <label>
              Tóm tắt (hiện ở danh sách)
              <textarea rows={2} maxLength={300} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </label>
            <label>
              Nội dung (xuống dòng để tách đoạn)
              <textarea rows={8} maxLength={8000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </label>
            <div className="pos-content-image">
              {draft.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.image} alt="" width={160} height={100} />
              ) : (
                <span className="pos-content-noimg">
                  <ImagePlus size={22} /> Chưa có ảnh
                </span>
              )}
              <div>
                <label className="secondary pos-upload">
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
                  <button type="button" className="secondary" onClick={() => setDraft({ ...draft, image: '' })}>
                    Bỏ ảnh
                  </button>
                )}
              </div>
            </div>
            <label>
              Trạng thái
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}>
                <option value="draft">Bản nháp (chưa hiện công khai)</option>
                <option value="published">Đăng lên trang công khai</option>
              </select>
            </label>
            {draft.id && draft.kind === 'event' && (
              <div className="pos-signups">
                <button type="button" className="secondary" onClick={() => showSignups(draft.id!)}>
                  Xem danh sách đăng ký ({counts[draft.id] ?? 0})
                </button>
                {signups && (
                  <table>
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>Điện thoại</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signups.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>
                            <a href={`tel:${s.phone}`}>{s.phone}</a>
                          </td>
                          <td>{s.note}</td>
                        </tr>
                      ))}
                      {!signups.length && (
                        <tr>
                          <td colSpan={3}>Chưa có ai đăng ký.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className="pos-content-actions">
              <button type="button" className="primary" disabled={busy} onClick={save}>
                {busy ? 'Đang lưu…' : 'Lưu bài'}
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => setDraft(null)}>
                Đóng
              </button>
              {draft.eventAt && draft.kind === 'event' && (
                <span className="form-note">
                  <CalendarDays size={14} /> {when(fromLocal(draft.eventAt))}
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
