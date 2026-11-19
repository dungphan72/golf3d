'use client';
import { useEffect, useState } from 'react';
import { DataTable, DialogHeading, ModalDialog } from './kit';
import { ROLES, ROLE_LABELS, canAssignRole, permissionsOf, type Permission, type Role, type PermissionActor } from '../../lib/auth/permissions';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../../lib/auth/permission-catalog';
import './staff-permissions.css';
import {
  UserPlus,
  KeyRound,
  ShieldAlert,
  Lock,
  Unlock,
  Search,
  Trash2,
} from 'lucide-react';

type Staff = { id: string; email: string; phone?: string; name: string; role: Role; active: boolean; permissions: Permission[]; customPermissions: boolean };

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

export function StaffPanel() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState<{ who: string; password: string } | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actor, setActor] = useState<(PermissionActor & { userId: string }) | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [draft, setDraft] = useState<Permission[]>([]);
  const [custom, setCustom] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [saved, setSaved] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [loading, setLoading] = useState(true);

  const assignable = ROLES.filter((r) => actor && canAssignRole(actor, r));
  const editable = !!actor && actor.role === 'owner' && editing?.role !== 'owner';
  const canManage = (s: Staff) => !!actor && (actor.role === 'owner' || (
    s.role !== 'owner' && s.role !== 'manager' && s.permissions.every((p) => permissionsOf(actor).includes(p))
  ));

  async function load() {
    try {
      const r = await fetch('/api/staff', { cache: 'no-store' });
      const v = (await r.json()) as { staff?: Staff[]; error?: string; actor?: PermissionActor & { userId: string } };
      if (!r.ok) throw new Error(v.error || 'Không tải được danh sách');
      setStaff(v.staff ?? []);
      setActor(v.actor ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh sách'); }
    finally { setLoading(false); }
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

  async function savePermissions() {
    if (!editing || !editable || busy) return;
    setBusy(true);
    setPermissionError('');
    try {
      await call({ action: 'permissions', userId: editing.id, expectedRole: editing.role, permissions: custom ? draft : null });
      setSaved(`Đã lưu quyền cho ${editing.name}. Quyền mới có hiệu lực từ yêu cầu tiếp theo.`);
      setEditing(null);
      await load();
    } catch (e) { setPermissionError(e instanceof Error ? e.message : 'Không lưu được quyền'); }
    finally { setBusy(false); }
  }

  return (
    <section className="staff-panel operate-staff">
      <h2>Tài khoản & Phân quyền</h2>
      <p className="muted">Chọn nhân viên để xem hoặc tùy chỉnh quyền theo từng chức năng. Chủ cơ sở được cấp quyền riêng; vai trò tiếp tục dùng làm mẫu và xác định phạm vi dữ liệu phụ trách.</p>
      {saved && <p role="status" className="info-strip">{saved}</p>}
      {loading && <p role="status">Đang tải danh sách nhân viên…</p>}
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
              disabled={busy || !actor || assignable.length === 0}
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
                header: 'Họ tên, email & SĐT',
                cell: (s) => (
                  <div className="staff-user-cell">
                    <strong>{s.name}</strong>
                    <small className="text-muted">{s.email}</small>
                    <small className="text-muted">
                      {s.phone || 'Chưa có số điện thoại'}{' '}
                      <button
                        type="button"
                        className="link-btn"
                        disabled={busy || !canManage(s)}
                        onClick={() => {
                          const v = window.prompt(`Số điện thoại đăng nhập của ${s.name} (để trống để xóa)`, s.phone ?? '');
                          if (v === null) return;
                          void act(() => call({ action: 'update', userId: s.id, phone: v }));
                        }}
                      >
                        Sửa
                      </button>
                    </small>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Vai trò',
                cell: (s) => {
                  const locked = !canManage(s) || s.id === actor?.userId;
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
                      {!assignable.includes(s.role) && <option value={s.role}>{ROLE_LABELS[s.role]}</option>}
                    </select>
                  );
                },
              },
              {
                key: 'permissions',
                header: 'Quyền chức năng',
                cell: (s) => (
                  <button type="button" className="secondary operate-btn-sm" disabled={busy || !actor}
                    onClick={() => { setEditing(s); setDraft(s.permissions); setCustom(s.customPermissions); setPermissionSearch(''); setPermissionError(''); }}>
                    <ShieldAlert size={14} /> {s.role === 'owner' ? 'Toàn quyền' : s.customPermissions ? 'Tùy chỉnh' : 'Theo vai trò'} · {s.permissions.length} quyền
                  </button>
                ),
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
                  const locked = !canManage(s) || s.id === actor?.userId;
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

      {editing && (
        <ModalDialog label={`Phân quyền cho ${editing.name}`} onClose={() => setEditing(null)} locked={busy}>
          <DialogHeading onClose={() => setEditing(null)} locked={busy}>Phân quyền · {editing.name}</DialogHeading>
          <div className="staff-permissions">
            <p className="muted">{editing.email} · {ROLE_LABELS[editing.role]}</p>
            {editing.role === 'owner' ? <p>Chủ cơ sở luôn có toàn bộ quyền để quản lý hệ thống.</p> : (
              <fieldset className="staff-permission-mode" disabled={!editable || busy}>
                <legend>Cách cấp quyền</legend>
                <label><input type="radio" name="permission-mode" checked={!custom} onChange={() => { setCustom(false); setDraft(permissionsOf(editing.role)); }} /> Theo vai trò {ROLE_LABELS[editing.role]}</label>
                <label><input type="radio" name="permission-mode" checked={custom} onChange={() => setCustom(true)} /> Tùy chỉnh cho nhân viên này</label>
              </fieldset>
            )}
            {!editable && editing.role !== 'owner' && <p className="muted">Chỉ Chủ cơ sở được thay đổi quyền riêng.</p>}
            {custom && <p className="muted">Quyền tùy chỉnh thay thế quyền mặc định và được giữ khi đổi vai trò. Cần cấp cả quyền xem của module để sử dụng các thao tác trong module đó.</p>}
            <label className="staff-permission-search">Tìm chức năng
              <input type="search" value={permissionSearch} onChange={(e) => setPermissionSearch(e.target.value)} placeholder="Tên module hoặc chức năng…" />
            </label>
            <p aria-live="polite">Đang cấp {draft.length} / {Object.keys(PERMISSION_LABELS).length} quyền</p>
            <div className="staff-permission-groups">
              {PERMISSION_GROUPS.filter((group) => `${group.title} ${group.permissions.map((p) => PERMISSION_LABELS[p]).join(' ')}`.toLocaleLowerCase('vi').includes(permissionSearch.toLocaleLowerCase('vi'))).map((group) => (
                <fieldset key={group.title} disabled={!editable || !custom || busy}>
                  <legend>{group.title} <span>{group.permissions.filter((p) => draft.includes(p)).length}/{group.permissions.length}</span></legend>
                  {group.permissions.map((p) => (
                    <label key={p}>
                      <input type="checkbox" checked={draft.includes(p)} disabled={p === 'view'}
                        onChange={(e) => setDraft((prev) => e.target.checked ? [...new Set([...prev, p])] : prev.filter((v) => v !== p))} />
                      <span>{PERMISSION_LABELS[p]}{p === 'view' && <small>Quyền cơ bản; dùng khóa tài khoản để ngừng truy cập.</small>}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            {permissionError && <p role="alert" className="error-box">{permissionError}</p>}
            <div className="staff-permission-footer">
              <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Đóng</button>
              {editable && <button type="button" className="primary" disabled={busy} onClick={savePermissions}>{busy ? 'Đang lưu…' : 'Lưu phân quyền'}</button>}
            </div>
          </div>
        </ModalDialog>
      )}

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
                const result = await call({ action: 'create', email, phone, name, role });
                setEmail('');
                setPhone('');
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
              Số điện thoại đăng nhập (không bắt buộc)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912 345 678"
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
