'use client';
import { useEffect, useState } from 'react';
import { DataTable, askText } from './kit';
import { MemberSelector } from './MemberSelector';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { LESSON_STATUS_LABELS } from '../../lib/coaching';
import {
  GraduationCap,
  Calendar,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserX,
  Phone,
} from 'lucide-react';

type Coach = { id: string; user_id: string | null; name: string; phone: string; active: number };
type Lesson = {
  id: string;
  coach_id: string;
  coach_name: string;
  customer_name: string;
  phone: string;
  start: number;
  minutes: number;
  status: string;
  price: number | null;
  note: string;
  coach_note: string;
};
type Data = { coaches: Coach[]; lessons: Lesson[]; me: string | null };

const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const toMs = (local: string) => Date.parse(local + ':00+07:00');

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/coaching', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string; replayed?: boolean };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}

export function CoachingPanel({ permissions }: { permissions: string[] }) {
  const canSchedule = permissions.includes('coach.schedule');
  const canManage = permissions.includes('coach.manage');
  const [data, setData] = useState<Data | null>(null);
  const [from] = useState(() => Date.now() - 6 * 3600_000);
  const [coachFilter, setCoachFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formTab, setFormTab] = useState<'schedule' | 'coach'>('schedule');

  const [form, setForm] = useState({
    coachId: '',
    customerName: '',
    phone: '',
    start: '',
    minutes: 60,
    price: '',
    note: '',
  });
  const [coachForm, setCoachForm] = useState({ name: '', phone: '' });
  const [key, setKey] = useState(operationKey());

  async function load() {
    const params = new URLSearchParams({
      from: String(from),
      to: String(from + 21 * 86_400_000),
    });
    if (coachFilter) params.set('coach', coachFilter);
    const r = await fetch('/api/coaching?' + params.toString(), { cache: 'no-store' });
    const v = (await r.json()) as Data & { error?: string };
    if (!r.ok) setError(v.error || 'Không tải được lịch dạy');
    else {
      setData(v);
      setError('');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachFilter]);

  async function act(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const activeCoaches = data?.coaches.filter((c) => c.active) ?? [];
  const lessons = data?.lessons ?? [];
  const scheduledCount = lessons.filter((l) => l.status === 'scheduled').length;
  const doneCount = lessons.filter((l) => l.status === 'done').length;

  const mark = async (l: Lesson, status: 'done' | 'no_show' | 'cancelled') => {
    const coachNote =
      status === 'cancelled'
        ? ''
        : await askText({
            title: 'Ghi chú buổi học',
            label: 'Ghi chú (không bắt buộc)',
            initial: l.coach_note,
            min: 0,
          });
    if (coachNote === null) return;
    return act(() => post({ action: 'lesson-status', id: l.id, status, coachNote }));
  };

  const filteredLessons = lessons.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.customer_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.coach_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section className="coaching-panel operate-coaching">
      {/* Top Coaching Overview Ribbon */}
      <div className="operate-ribbon">
        <div className="operate-kpi-card highlight">
          <div className="operate-kpi-label">Buổi học sắp tới</div>
          <div className="operate-kpi-val text-green">{scheduledCount}</div>
          <div className="operate-kpi-sub">Trong vòng 3 tuần tới</div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Đã hoàn thành</div>
          <div className="operate-kpi-val" style={{ color: '#16a34a' }}>
            {doneCount}
          </div>
          <div className="operate-kpi-sub">Buổi học thành công</div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Đội ngũ HLV</div>
          <div className="operate-kpi-val" style={{ color: '#2563eb' }}>
            {activeCoaches.length}
            <span className="operate-kpi-sub" style={{ marginLeft: '6px' }}>
              / {data?.coaches.length ?? 0} người
            </span>
          </div>
          <div className="operate-kpi-sub">Đang nhận lịch dạy</div>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main Content Layout: Table & Forms */}
      <div className="operate-coaching-layout">
        <div className="coaching-schedule-card">
          <div className="operate-filterbar" style={{ padding: '0 0 14px 0' }}>
            <div className="operate-filter-left">
              <div className="operate-search-wrap">
                <Search size={15} className="operate-search-icon" />
                <input
                  type="search"
                  placeholder="Tìm học viên, số ĐT, HLV…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="operate-search-input"
                />
              </div>

              {!data?.me && (
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  className="operate-select"
                  style={{ width: 'auto' }}
                >
                  <option value="">Tất cả Huấn luyện viên</option>
                  {data?.coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.active ? '' : '(ngừng)'}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="operate-select"
                style={{ width: 'auto' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="scheduled">Đã xếp lịch</option>
                <option value="done">Đã dạy xong</option>
                <option value="no_show">Học viên vắng</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div className="operate-filter-right">
              <button
                type="button"
                className="secondary operate-btn"
                onClick={load}
                disabled={busy}
              >
                <RefreshCw size={15} /> Tải lại
              </button>
            </div>
          </div>

          <DataTable
            rows={filteredLessons}
            rowKey={(l) => l.id}
            empty="Chưa có buổi học nào trong khoảng thời gian này"
            columns={[
              {
                key: 'time',
                header: 'Thời gian',
                cell: (l) => (
                  <div className="lesson-time-cell">
                    <strong>{when(l.start)}</strong>
                    <span className="lesson-duration-badge">
                      <Clock size={12} /> {l.minutes} phút
                    </span>
                  </div>
                ),
              },
              {
                key: 'coach',
                header: 'HLV phụ trách',
                cell: (l) => <strong>{l.coach_name}</strong>,
              },
              {
                key: 'student',
                header: 'Học viên',
                cell: (l) => (
                  <div className="lesson-student-cell">
                    <strong>{l.customer_name}</strong>
                    <div className="lesson-student-meta">
                      <Phone size={11} /> {l.phone}
                      {l.price != null && (
                        <span className="lesson-price">· {money(l.price)}</span>
                      )}
                    </div>
                    {l.note && <div className="lesson-note">"{l.note}"</div>}
                    {l.coach_note && (
                      <div className="lesson-coach-note">
                        <FileText size={11} /> Ghi chú HLV: {l.coach_note}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                cell: (l) => {
                  const tone =
                    l.status === 'done'
                      ? 'paid'
                      : l.status === 'scheduled'
                        ? 'playing'
                        : 'cancelled';
                  return (
                    <span className={`badge ${tone}`}>
                      {LESSON_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  );
                },
              },
              {
                key: 'act',
                header: 'Thao tác',
                cell: (l) => (
                  <div className="ds-cell-actions">
                    {l.status === 'scheduled' && (
                      <>
                        {l.start <= from + 6 * 3600_000 && (
                          <>
                            <button
                              className="secondary operate-btn-sm"
                              disabled={busy}
                              title="Xác nhận đã hoàn thành buổi dạy"
                              onClick={() => mark(l, 'done')}
                            >
                              <CheckCircle2 size={13} style={{ color: '#16a34a' }} /> Đã dạy
                            </button>
                            <button
                              className="secondary operate-btn-sm"
                              disabled={busy}
                              title="Học viên không đến"
                              onClick={() => mark(l, 'no_show')}
                            >
                              <UserX size={13} style={{ color: '#d97706' }} /> Vắng
                            </button>
                          </>
                        )}
                        {canSchedule && (
                          <button
                            className="secondary operate-btn-sm"
                            disabled={busy}
                            title="Hủy buổi học"
                            onClick={() => mark(l, 'cancelled')}
                          >
                            <XCircle size={13} style={{ color: '#dc2626' }} /> Hủy
                          </button>
                        )}
                      </>
                    )}
                    {l.status !== 'cancelled' && (
                      <button
                        className="secondary operate-btn-sm"
                        disabled={busy}
                        title="Thêm hoặc sửa ghi chú buổi học"
                        onClick={async () => {
                          const coachNote = await askText({
                            title: 'Ghi chú buổi học',
                            label: 'Ghi chú',
                            initial: l.coach_note,
                            min: 0,
                          });
                          if (coachNote !== null)
                            act(() => post({ action: 'lesson-note', id: l.id, coachNote }));
                        }}
                      >
                        <FileText size={13} /> Ghi chú
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* Right Action Forms: Schedule Lesson & Add Coach */}
        {(canSchedule || canManage) && (
          <div className="coaching-side-card">
            <div className="operate-cat-pills" style={{ marginBottom: '16px' }}>
              {canSchedule && (
                <button
                  type="button"
                  className={`operate-pill ${formTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setFormTab('schedule')}
                >
                  <Calendar size={13} style={{ marginRight: '4px' }} />
                  Xếp lịch học
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className={`operate-pill ${formTab === 'coach' ? 'active' : ''}`}
                  onClick={() => setFormTab('coach')}
                >
                  <GraduationCap size={13} style={{ marginRight: '4px' }} />
                  Quản lý HLV ({data?.coaches.length ?? 0})
                </button>
              )}
            </div>

            {formTab === 'schedule' && canSchedule && (
              <form
                className="operate-coaching-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    await post({
                      action: 'lesson-create',
                      requestId: key,
                      coachId: form.coachId,
                      customerName: form.customerName,
                      phone: form.phone,
                      start: toMs(form.start),
                      minutes: form.minutes,
                      price: form.price === '' ? null : Number(form.price),
                      note: form.note,
                    });
                    setKey(operationKey());
                    setForm({ ...form, customerName: '', phone: '', note: '', price: '' });
                  });
                }}
              >
                <h3 className="side-form-title">
                  <Calendar size={16} /> Đặt lịch đào tạo mới
                </h3>

                <label className="operate-label">
                  Huấn luyện viên phụ trách
                  <select
                    value={form.coachId}
                    onChange={(e) => setForm({ ...form, coachId: e.target.value })}
                    required
                    className="operate-select"
                  >
                    <option value="">— Chọn HLV —</option>
                    {activeCoaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="operate-form-row">
                  <label className="operate-label" style={{ flex: 1.5 }}>
                    Bắt đầu (giờ VN)
                    <input
                      type="datetime-local"
                      step={900}
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      required
                      className="operate-input"
                    />
                  </label>
                  <label className="operate-label" style={{ flex: 1 }}>
                    Thời lượng
                    <select
                      value={form.minutes}
                      onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
                      className="operate-select"
                    >
                      {[30, 45, 60, 90, 120].map((n) => (
                        <option key={n} value={n}>
                          {n} phút
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="operate-member-selector-section">
                  <MemberSelector
                    required
                    customer={form.customerName}
                    phone={form.phone}
                    onChange={(customer, phone) => {
                      setForm((prev) => ({
                        ...prev,
                        customerName: customer,
                        phone,
                      }));
                    }}
                  />
                </div>

                <label className="operate-label">
                  Học phí dự kiến (₫)
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={form.price}
                    placeholder="VD: 500000"
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="operate-input"
                  />
                </label>

                <label className="operate-label">
                  Ghi chú buổi học
                  <input
                    value={form.note}
                    placeholder="Nội dung bài học, lưu ý của học viên…"
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="operate-input"
                  />
                </label>

                <button
                  className="primary operate-btn"
                  disabled={busy}
                  style={{ marginTop: '8px' }}
                >
                  <Calendar size={15} />
                  {busy ? 'Đang xếp lịch…' : 'Xác nhận xếp lịch dạy'}
                </button>
              </form>
            )}

            {formTab === 'coach' && canManage && (
              <div className="coaching-coach-mgmt">
                <form
                  className="operate-coaching-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await post({
                        action: 'coach-save',
                        ...coachForm,
                        userId: null,
                        active: true,
                      });
                      setCoachForm({ name: '', phone: '' });
                    });
                  }}
                >
                  <h3 className="side-form-title">
                    <GraduationCap size={16} /> Thêm HLV mới
                  </h3>
                  <label className="operate-label">
                    Họ và tên HLV
                    <input
                      value={coachForm.name}
                      onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                      placeholder="VD: Nguyễn Văn Thắng (PGA)"
                      minLength={2}
                      required
                      className="operate-input"
                    />
                  </label>
                  <label className="operate-label">
                    Số điện thoại
                    <input
                      type="tel"
                      value={coachForm.phone}
                      placeholder="VD: 0912345678"
                      onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })}
                      className="operate-input"
                    />
                  </label>
                  <button className="primary operate-btn" disabled={busy}>
                    <Plus size={15} /> Thêm HLV
                  </button>
                </form>

                <div className="coaches-list-section">
                  <h4 className="coaches-list-title">Danh sách Huấn luyện viên</h4>
                  <div className="coaches-items-wrap">
                    {data?.coaches.map((c) => (
                      <div key={c.id} className="coach-item-row">
                        <div className="coach-item-info">
                          <strong>{c.name}</strong>
                          <small className="text-muted">{c.phone || 'Chưa có SĐT'}</small>
                        </div>
                        <button
                          className="secondary operate-btn-sm"
                          disabled={busy}
                          onClick={(e) => {
                            e.preventDefault();
                            act(() =>
                              post({
                                action: 'coach-save',
                                id: c.id,
                                name: c.name,
                                phone: c.phone,
                                userId: c.user_id,
                                active: !c.active,
                              }),
                            );
                          }}
                        >
                          {c.active ? 'Tạm ngừng' : 'Kích hoạt'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
