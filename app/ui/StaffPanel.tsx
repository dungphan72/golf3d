'use client';
import { useEffect, useState } from 'react';
import { DataTable } from './kit';
import { ROLES, ROLE_LABELS, type Role } from '../../lib/auth/permissions';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  Mail,
  UserCheck,
  Search,
} from 'lucide-react';

type Staff = { id: string; email: string; name: string; role: Role; active: boolean };

async function call(body: unknown) {
  const r = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string; temporaryPassword?: string };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}

export function StaffPanel({ actorRole }: { actorRole: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState<{ who: string; password: string } | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const assignable = ROLES.filter((r) => actorRole === 'owner' || r !== 'owner');

  async function load() {
    const r = await fetch('/api/staff', { cache: 'no-store' });
    const v = (await r.json()) as { staff?: Staff[]; error?: string };
    if (!r.ok) setError(v.error || 'Không tải được danh sách');
    else setStaff(v.staff ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function act(task: () => Promise<{ temporaryPassword?: string }>, who = '') {
    setBusy(true);
    setError('');
    try {
      const result = await task();
      setSecret(result.temporaryPassword ? { who, password: result.temporaryPassword } : null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const activeCount = staff.filter((s) => s.active).length;
  const lockedCount = staff.length - activeCount;

  const filteredStaff = staff.filter((s) => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <section className="staff-panel operate-staff">
      {/* Top Staff Metrics Ribbon */}
      <div className="operate-ribbon">
        <div className="operate-kpi-card highlight">
          <div className="operate-kpi-label">Tổng nhân sự hệ thống</div>
          <div className="operate-kpi-val text-green">{staff.length}</div>
          <div className="operate-kpi-sub">Tài khoản quản trị & nhân viên</div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Đang hoạt động</div>
          <div className="operate-kpi-val" style={{ color: '#16a34a' }}>
            {activeCount}
          </div>
          <div className="operate-kpi-sub">Có quyền truy cập ca & nghiệp vụ</div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Tạm khóa tài khoản</div>
          <div
            className="operate-kpi-val"
            style={{ color: lockedCount > 0 ? '#dc2626' : 'var(--text)' }}
          >
            {lockedCount}
          </div>
          <div className="operate-kpi-sub">Không thể đăng nhập</div>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <ShieldAlert size={16} /> {error}
        </div>
      )}

      {secret && (
        <div className="info-strip" role="status" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
          <KeyRound size={16} style={{ color: '#d97706' }} />
          <span>
            Mật khẩu tạm thời cho <strong>{secret.who}</strong>: <code style={{ fontSize: '14px', fontWeight: 800, padding: '2px 6px', background: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{secret.password}</code> (Chỉ hiển thị một lần. Hãy gửi cho nhân viên để đổi mật khẩu lần đầu).
          </span>
        </div>
      )}

      {/* Staff Management & Creation Grid */}
      <div className="operate-staff-layout">
        <div className="staff-table-card">
          <div className="operate-filterbar" style={{ padding: '0 0 12px 0' }}>
            <div className="operate-filter-left">
              <div className="operate-search-wrap">
                <Search size={15} className="operate-search-icon" />
                <input
                  type="search"
                  placeholder="Tìm tên, email nhân viên…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="operate-search-input"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="operate-select"
                style={{ width: 'auto' }}
              >
                <option value="all">Tất cả vai trò</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            rows={filteredStaff}
            rowKey={(s) => s.id}
            empty="Chưa có nhân viên phù hợp"
            columns={[
              {
                key: 'name',
                header: 'Họ tên & Email',
                cell: (s) => (
                  <div className="staff-user-cell">
                    <strong>{s.name}</strong>
                    <small className="text-muted">{s.email}</small>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Phân quyền',
                cell: (s) => {
                  const locked = s.role === 'owner' && actorRole !== 'owner';
                  return (
                    <select
                      aria-label={'Vai trò của ' + s.name}
                      value={s.role}
                      disabled={busy || locked}
                      className="operate-select-sm"
                      onChange={(e) =>
                        act(() => call({ action: 'update', userId: s.id, role: e.target.value }))
                      }
                    >
                      {assignable.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                      {locked && <option value="owner">{ROLE_LABELS.owner}</option>}
                    </select>
                  );
                },
              },
              {
                key: 'status',
                header: 'Trạng thái',
                cell: (s) => (
                  <span className={'badge ' + (s.active ? 'paid' : 'cancelled')}>
                    {s.active ? 'Đang hoạt động' : 'Đã khóa'}
                  </span>
                ),
              },
              {
                key: 'act',
                header: 'Thao tác',
                cell: (s) => {
                  const locked = s.role === 'owner' && actorRole !== 'owner';
                  return (
                    <div className="ds-cell-actions">
                      <button
                        className="secondary operate-btn-sm"
                        disabled={busy || locked}
                        title={s.active ? 'Khóa quyền truy cập' : 'Kích hoạt lại'}
                        onClick={() =>
                          act(() => call({ action: 'update', userId: s.id, active: !s.active }))
                        }
                      >
                        {s.active ? <Lock size={13} /> : <Unlock size={13} />}
                        {s.active ? 'Khóa' : 'Mở'}
                      </button>
                      <button
                        className="secondary operate-btn-sm"
                        disabled={busy || locked}
                        title="Tạo lại mật khẩu ngẫu nhiên"
                        onClick={() => act(() => call({ action: 'reset', userId: s.id }), s.email)}
                      >
                        <KeyRound size={13} /> Đổi mật khẩu
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        </div>

        {/* Add Staff Card Form */}
        <div className="staff-create-card">
          <h3 className="staff-form-title">
            <UserPlus size={18} /> Thêm nhân viên mới
          </h3>
          <p className="staff-form-desc">
            Nhân viên mới sẽ được cấp mật khẩu tạm thời để đăng nhập và tự đổi mật khẩu.
          </p>
          <form
            className="operate-staff-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const result = await call({ action: 'create', email, name, role });
                setEmail('');
                setName('');
                return result;
              }, email);
            }}
          >
            <label className="operate-label">
              Họ và tên
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                required
                minLength={2}
                className="operate-input"
              />
            </label>
            <label className="operate-label">
              Email đăng nhập
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: an.nguyen@golf3d.vn"
                required
                className="operate-input"
              />
            </label>
            <label className="operate-label">
              Vai trò / Phân quyền
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="operate-select"
              >
                {assignable.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary operate-btn" disabled={busy} style={{ marginTop: '8px' }}>
              <UserPlus size={16} />
              {busy ? 'Đang tạo…' : 'Tạo tài khoản nhân viên'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
