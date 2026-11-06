'use client';
import { useEffect, useState } from 'react';
import { DataTable } from './kit';
import { ROLES, ROLE_LABELS, type Role } from '../../lib/auth/permissions';

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
  return (
    <section className="staff-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {secret && (
        <div className="form-note" role="status">
          Mật khẩu tạm thời của <strong>{secret.who}</strong>: <code>{secret.password}</code> — chỉ
          hiển thị một lần; nhân viên sẽ phải đổi khi đăng nhập lần đầu.
        </div>
      )}
      <DataTable
        rows={staff}
        rowKey={(s) => s.id}
        empty="Chưa có nhân viên"
        columns={[
          { key: 'name', header: 'Tên', cell: (s) => <strong>{s.name}</strong> },
          { key: 'email', header: 'Email', cell: (s) => s.email },
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
            header: '',
            cell: (s) => {
              const locked = s.role === 'owner' && actorRole !== 'owner';
              return (
                <div className="ds-cell-actions">
                  <button
                    className="secondary"
                    disabled={busy || locked}
                    onClick={() =>
                      act(() => call({ action: 'update', userId: s.id, active: !s.active }))
                    }
                  >
                    {s.active ? 'Khóa' : 'Mở khóa'}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || locked}
                    onClick={() => act(() => call({ action: 'reset', userId: s.id }), s.email)}
                  >
                    Cấp lại mật khẩu
                  </button>
                </div>
              );
            },
          },
        ]}
      />
      <form
        className="form-grid"
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
        <h3 className="form-label">Thêm nhân viên</h3>
        <label>
          Họ tên
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
        <label>
          Email đăng nhập
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Vai trò
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {assignable.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={busy}>
          Tạo tài khoản
        </button>
      </form>
    </section>
  );
}
