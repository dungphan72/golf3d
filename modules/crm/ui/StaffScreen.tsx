'use client';
import { useState } from 'react';
import { KeyRound, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import {
  Card,
  Chips,
  DataTable,
  DialogHeading,
  Field,
  FilterBar,
  KpiTile,
  Loading,
  ModalDialog,
  StatusBadge,
  useDialogs,
} from '../../../app/ui/kit';
import { call, errText, type Staff } from './api';
import { useLoad } from './Screens';

type Extra = { userId: string; team: string; isLeader: number; extension: string; zaloId: string; notifyEmail: string };
type Config = {
  settings: { distribution: { paused?: string[] } };
  staff: Staff[];
  staffExtra: Extra[];
  me: string;
};
type Role = 'sale' | 'cskh' | 'manager' | 'cashier';
type Form = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  team: string;
  isLeader: boolean;
  extension: string;
  zaloId: string;
  notifyEmail: string;
  receiveLeads: boolean;
  active: boolean;
};

const ROLES: Record<Role, { label: string; help: string }> = {
  sale: { label: 'Sale', help: 'Nhận lead, tư vấn, bán gói, đặt lịch.' },
  cskh: { label: 'CSKH', help: 'Chăm sóc hội viên, telesales, hỗ trợ khách.' },
  manager: { label: 'Quản lý', help: 'Chia lead, thu hồi, cấu hình, xem báo cáo.' },
  cashier: { label: 'Thu ngân', help: 'Thu tiền, check-in tại quầy.' },
};
const EMPTY: Form = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'sale',
  team: '',
  isLeader: false,
  extension: '',
  zaloId: '',
  notifyEmail: '',
  receiveLeads: true,
  active: true,
};

/** Nhân sự: who works in the CRM, their role, team, extension, and whether they receive new leads. */
export function StaffScreen() {
  const { data, error, reload } = useLoad<Config>('/api/crm2/config');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [secret, setSecret] = useState<{ who: string; email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const { confirm, node } = useDialogs();
  if (error && !data) return <div className="error-box" role="alert">{error}</div>;
  if (!data) return <Loading />;

  const paused = data.settings.distribution.paused ?? [];
  const extra = (id: string) => data.staffExtra.find((x) => x.userId === id);
  const rows = data.staff.filter((m) => {
    if (filter !== 'all' && m.role !== filter) return false;
    const x = extra(m.id);
    const hay = `${m.name} ${m.email} ${x?.team ?? ''} ${x?.extension ?? ''}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });
  const active = (m: Staff) => m.active !== false;

  const run = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await call<{ temporaryPassword?: string }>('/api/crm2/config', body);
      await reload();
      setMsg(ok);
      return r;
    } catch (e) {
      setErr(errText(e));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const openEdit = (m: Staff) => {
    const x = extra(m.id);
    setForm({
      id: m.id,
      name: m.name,
      email: m.email,
      password: '',
      role: (m.role as Role) in ROLES ? (m.role as Role) : 'sale',
      team: x?.team ?? '',
      isLeader: x?.isLeader === 1,
      extension: x?.extension ?? '',
      zaloId: x?.zaloId ?? '',
      notifyEmail: x?.notifyEmail ?? '',
      receiveLeads: !paused.includes(m.id),
      active: active(m),
    });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const common = {
      name: form.name.trim(),
      role: form.role,
      isLeader: form.isLeader,
      team: form.team.trim(),
      extension: form.extension.trim(),
      zaloId: form.zaloId.trim(),
      notifyEmail: form.notifyEmail.trim(),
      receiveLeads: form.receiveLeads,
    };
    if (form.id) {
      const r = await run({ action: 'update_sale', userId: form.id, active: form.active, ...common }, `Đã cập nhật ${form.name}`);
      if (r) setForm(null);
    } else {
      const r = await run(
        { action: 'create_sale', email: form.email.trim(), password: form.password.trim() || undefined, ...common },
        `Đã thêm ${form.name}`,
      );
      if (r) {
        setForm(null);
        if (r.temporaryPassword) setSecret({ who: form.name, email: form.email, password: r.temporaryPassword });
      }
    }
  };
  const resetPassword = async (m: Staff) => {
    if (!(await confirm({ title: `Tạo mật khẩu mới cho ${m.name}?`, message: 'Mọi phiên đăng nhập hiện tại của người này sẽ bị đăng xuất.' }))) return;
    const r = await run({ action: 'reset_password', userId: m.id }, 'Đã tạo mật khẩu mới');
    if (r?.temporaryPassword) setSecret({ who: m.name, email: m.email, password: r.temporaryPassword });
  };
  const remove = async (m: Staff) => {
    if (!(await confirm({ title: `Xóa ${m.name} khỏi hệ thống?`, message: 'Không thể hoàn tác. Nếu chỉ tạm nghỉ, hãy khóa tài khoản.', danger: true }))) return;
    await run({ action: 'delete_sale', userId: m.id }, `Đã xóa ${m.name}`);
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <>
      {node}
      {err && <div className="error-box" role="alert">{err}</div>}
      {msg && <div role="status" className="notice-box">{msg}</div>}
      <section className="ds-tiles" aria-label="Tổng quan nhân sự">
        <KpiTile label="Nhân sự" value={data.staff.length} />
        <KpiTile label="Đang nhận lead" value={data.staff.filter((m) => active(m) && !paused.includes(m.id)).length} />
        <KpiTile label="Trưởng nhóm" value={data.staffExtra.filter((x) => x.isLeader === 1).length} />
        <KpiTile label="Đã khóa" value={data.staff.filter((m) => !active(m)).length} />
      </section>
      <Card title="Nhân sự kinh doanh" sub="Vai trò quyết định màn hình và thao tác mỗi người được dùng.">
        <FilterBar
          right={
            <button className="primary" onClick={() => setForm({ ...EMPTY })}>
              <Plus size={15} /> Thêm nhân sự
            </button>
          }
        >
          <Chips
            value={filter}
            onChange={setFilter}
            options={[{ key: 'all', label: 'Tất cả' }, ...(Object.keys(ROLES) as Role[]).map((k) => ({ key: k, label: ROLES[k].label }))]}
          />
          <input style={{ maxWidth: 280 }} aria-label="Tìm nhân sự" placeholder="Tìm tên, email, nhóm, máy lẻ…" value={q} onChange={(e) => setQ(e.target.value)} />
        </FilterBar>
        <DataTable
          label="Danh sách nhân sự"
          rows={rows}
          rowKey={(m) => m.id}
          empty="Không có nhân sự"
          columns={[
            {
              key: 'n',
              header: 'Họ tên',
              cell: (m: Staff) => (
                <div>
                  <strong>{m.name}</strong>
                  <div className="muted">{m.email}</div>
                </div>
              ),
            },
            { key: 'r', header: 'Vai trò', cell: (m: Staff) => <StatusBadge tone="info">{m.role === 'owner' ? 'Chủ cơ sở' : (ROLES[m.role as Role]?.label ?? m.role)}</StatusBadge> },
            {
              key: 't',
              header: 'Nhóm',
              hideOnPhone: true,
              cell: (m: Staff) => (
                <span>
                  {extra(m.id)?.team || '—'}
                  {extra(m.id)?.isLeader === 1 ? ' · trưởng nhóm' : ''}
                </span>
              ),
            },
            { key: 'x', header: 'Máy lẻ', hideOnPhone: true, cell: (m: Staff) => extra(m.id)?.extension || '—' },
            { key: 'z', header: 'Zalo', hideOnPhone: true, cell: (m: Staff) => extra(m.id)?.zaloId || '—' },
            {
              key: 'l',
              header: 'Nhận lead',
              cell: (m: Staff) => (
                <label className="crm-switch-wrap">
                  <input
                    type="checkbox"
                    className="crm-switch-input"
                    aria-label={`Nhận lead: ${m.name}`}
                    checked={active(m) && !paused.includes(m.id)}
                    disabled={busy || !active(m)}
                    onChange={(e) => void run({ action: 'update_sale', userId: m.id, receiveLeads: e.target.checked }, `Đã cập nhật ${m.name}`)}
                  />
                  <span className="crm-switch-slider" />
                </label>
              ),
            },
            {
              key: 's',
              header: 'Trạng thái',
              cell: (m: Staff) => <StatusBadge tone={active(m) ? 'ok' : 'muted'}>{active(m) ? 'Hoạt động' : 'Đã khóa'}</StatusBadge>,
            },
            {
              key: 'a',
              header: '',
              cell: (m: Staff) => (
                <span className="crm-actions">
                  <button className="secondary" aria-label={`Sửa ${m.name}`} title="Sửa" onClick={() => openEdit(m)}>
                    <Pencil size={14} />
                  </button>
                  <button className="secondary" aria-label={`Đổi mật khẩu ${m.name}`} title="Cấp mật khẩu mới" disabled={busy} onClick={() => void resetPassword(m)}>
                    <KeyRound size={14} />
                  </button>
                  <button
                    className="secondary"
                    aria-label={`${active(m) ? 'Khóa' : 'Mở khóa'} ${m.name}`}
                    title={active(m) ? 'Khóa tài khoản' : 'Mở khóa'}
                    disabled={busy || m.id === data.me}
                    onClick={() => void run({ action: 'update_sale', userId: m.id, active: !active(m) }, active(m) ? `Đã khóa ${m.name}` : `Đã mở khóa ${m.name}`)}
                  >
                    {active(m) ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button className="secondary" aria-label={`Xóa ${m.name}`} title="Xóa" disabled={busy || m.id === data.me} onClick={() => void remove(m)}>
                    <Trash2 size={14} />
                  </button>
                </span>
              ),
            },
          ]}
        />
      </Card>

      {form && (
        <ModalDialog label={form.id ? 'Sửa nhân sự' : 'Thêm nhân sự'} onClose={() => setForm(null)} locked={busy}>
          <DialogHeading onClose={() => setForm(null)} locked={busy}>
            {form.id ? `Sửa ${form.name}` : 'Thêm nhân sự'}
          </DialogHeading>
          <form onSubmit={submit} className="ds-form">
            <Field label="Họ tên">
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>
            {!form.id && (
              <>
                <Field label="Email đăng nhập">
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </Field>
                <Field label="Mật khẩu ban đầu" hint="Để trống để hệ thống tự tạo mật khẩu tạm.">
                  <input value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
                </Field>
              </>
            )}
            <Field label="Vai trò" hint={ROLES[form.role].help}>
              <select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
                {(Object.keys(ROLES) as Role[]).map((k) => (
                  <option key={k} value={k}>
                    {ROLES[k].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nhóm">
              <input value={form.team} onChange={(e) => set('team', e.target.value)} placeholder="Sales 1" />
            </Field>
            <Field label="Máy lẻ tổng đài">
              <input value={form.extension} onChange={(e) => set('extension', e.target.value)} />
            </Field>
            <Field label="Zalo ID">
              <input value={form.zaloId} onChange={(e) => set('zaloId', e.target.value)} />
            </Field>
            <Field label="Email nhận thông báo lead">
              <input type="email" value={form.notifyEmail} onChange={(e) => set('notifyEmail', e.target.value)} />
            </Field>
            <label>
              <input type="checkbox" checked={form.isLeader} onChange={(e) => set('isLeader', e.target.checked)} /> Trưởng nhóm
            </label>
            <label>
              <input type="checkbox" checked={form.receiveLeads} onChange={(e) => set('receiveLeads', e.target.checked)} /> Nhận lead mới
            </label>
            {form.id && (
              <label>
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Tài khoản hoạt động
              </label>
            )}
            <div className="crm-actions">
              <button className="primary" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => setForm(null)}>
                Hủy
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {secret && (
        <ModalDialog label="Mật khẩu tạm thời" onClose={() => setSecret(null)}>
          <DialogHeading onClose={() => setSecret(null)} eyebrow={secret.email}>
            Mật khẩu của {secret.who}
          </DialogHeading>
          <p>
            <code className="tnum">{secret.password}</code>
          </p>
          <p className="muted">Mật khẩu chỉ hiện một lần. Hãy chép và gửi cho người dùng, họ nên đổi sau khi đăng nhập.</p>
          <div className="crm-actions">
            <button className="primary" onClick={() => void navigator.clipboard?.writeText(secret.password)}>
              Sao chép
            </button>
            <button className="secondary" onClick={() => setSecret(null)}>
              Đóng
            </button>
          </div>
        </ModalDialog>
      )}
    </>
  );
}
