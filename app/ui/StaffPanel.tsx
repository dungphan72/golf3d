'use client';
import { useEffect, useState } from 'react';
import { DataTable, DialogHeading, ModalDialog } from './kit';
import { ROLES, ROLE_LABELS, type Role } from '../../lib/auth/permissions';
import {
  UserPlus,
  KeyRound,
  ShieldAlert,
  Lock,
  Unlock,
  Search,
  Trash2,
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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      const r = await task();
      await load();
      if (r.temporaryPassword) {
        setSecret({ who, password: r.temporaryPassword });
      }
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

      {/* Staff Management Table */}
      <div className="operate-staff-layout">
        <div className="staff-table-card">
          <div
            className="operate-filterbar"
            style={{
              padding: '0 0 14px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="operate-filter-left" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

            {/* Button mở form tạo tài khoản */}
            <button
              type="button"
              className="primary operate-btn"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <UserPlus size={16} />
              <span>Tạo tài khoản</span>
            </button>
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
                header: 'Vai trò',
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
                      {s.role !== 'owner' && (
                        <button
                          className="secondary operate-btn-sm"
                          disabled={busy || locked}
                          title="Xóa nhân viên khỏi hệ thống"
                          style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fff5f5' }}
                          onClick={() => {
                            if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${s.name}" (${s.email}) khỏi hệ thống?`)) return;
                            act(() => call({ action: 'delete', userId: s.id }));
                          }}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Modal Dialog Form Tạo Tài Khoản */}
      {showCreateModal && (
        <ModalDialog
          label="Tạo tài khoản nhân viên"
          onClose={() => setShowCreateModal(false)}
          locked={busy}
        >
          <DialogHeading onClose={() => setShowCreateModal(false)} eyebrow="QUẢN TRỊ & NHÂN SỰ" locked={busy}>
            Tạo tài khoản nhân viên
          </DialogHeading>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
            Nhân viên mới sẽ được cấp mật khẩu tạm thời để đăng nhập và tự đổi mật khẩu lần đầu.
          </p>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const result = await call({ action: 'create', email, name, role });
                setEmail('');
                setName('');
                setShowCreateModal(false);
                return result;
              }, email);
            }}
          >
            <label>
              Họ và tên
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                required
                minLength={2}
              />
            </label>
            <label>
              Email đăng nhập
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: an.nguyen@golf3d.vn"
                required
              />
            </label>
            <label>
              Vai trò / Phân quyền
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {assignable.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={busy}
              >
                Hủy
              </button>
              <button type="submit" className="primary" disabled={busy}>
                <UserPlus size={16} />
                {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </section>
  );
}
