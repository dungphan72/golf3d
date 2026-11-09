'use client';
import { useState, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Search,
  Copy,
  Check,
  X,
  Phone,
  Mail,
  Award,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { call, errText, type Staff } from './api';

export type StaffExtra = {
  userId: string;
  team: string;
  isLeader: number;
  extension: string;
  zaloId: string;
  notifyEmail: string;
};

export type SalesConfig = {
  settings: {
    distribution: {
      paused: string[];
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  staff: Staff[];
  staffExtra: StaffExtra[];
  me: string;
  role: string;
};

// Sales & Club Roles Capabilities
export const ROLE_DETAILS: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeColor: string;
    description: string;
    capabilities: { name: string; desc: string; granted: boolean }[];
  }
> = {
  sale: {
    label: 'Nhân viên Sale (Tư vấn bán hàng)',
    badgeBg: '#e8f5e9',
    badgeColor: '#025c0a',
    description: 'Trực tiếp tiếp nhận lead, tư vấn, đặt phòng tập 3D và chốt hợp đồng hội viên.',
    capabilities: [
      { name: 'Nhận Lead tự động', desc: 'Nhận khách từ Website, Fanpage, Zalo qua vòng quay chia lead', granted: true },
      { name: 'Xử lý Pipeline (crm.work)', desc: 'Gọi điện, ghi chú lịch sử tư vấn, chuyển đổi giai đoạn cơ hội', granted: true },
      { name: 'Bán thẻ & Gói tập (member.sell)', desc: 'Tạo đơn đặt cọc, bán gói chơi 3D & thẻ hội viên', granted: true },
      { name: 'Đặt chỗ & Line 3D (booking.create)', desc: 'Giữ chỗ phòng golf 3D, đặt lịch đánh thử cho khách', granted: true },
      { name: 'Lên lịch HLV (coach.schedule)', desc: 'Đặt lịch học thử và khoá học với huấn luyện viên golf', granted: true },
      { name: 'Quản trị Lead toàn đội (crm.manage)', desc: 'Phân bổ và điều phối lead của nhân sự khác', granted: false },
    ],
  },
  cskh: {
    label: 'CSKH & Telesales',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    description: 'Chăm sóc hội viên hiện tại, gọi telesales kịch bản và hỗ trợ dịch vụ line.',
    capabilities: [
      { name: 'Nhận Lead & Dữ liệu Telesales', desc: 'Tiếp nhận lead chăm sóc lại và khách hàng sắp hết hạn gói', granted: true },
      { name: 'Xử lý Pipeline & Chăm sóc (crm.work)', desc: 'Thực hiện cuộc gọi theo kịch bản nhắc hạn, chúc mừng sinh nhật', granted: true },
      { name: 'Hỗ trợ hội viên (support.handle)', desc: 'Xử lý khiếu nại, trợ giúp thẻ và dịch vụ tại quầy', granted: true },
      { name: 'Đặt F&B cho khách (fnb.order)', desc: 'Order đồ ăn, nước uống quầy lounge tại line chơi', granted: true },
      { name: 'Bán thẻ & Gói tập (member.sell)', desc: 'Tái ký gói hội viên, nâng hạng phòng VIP', granted: true },
      { name: 'Đặt lịch line & HLV', desc: 'Đặt giờ chơi và lịch tập với chuyên gia', granted: true },
    ],
  },
  manager: {
    label: 'Quản lý kinh doanh (Sales Manager)',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    description: 'Toàn quyền điều hành kinh doanh, cấu hình chia lead, quản trị nhân sự sales.',
    capabilities: [
      { name: 'Quản trị Đội ngũ Sales (staff.manage)', desc: 'Thêm, sửa, xóa, phân quyền và cấp lại mật khẩu sales', granted: true },
      { name: 'Điều phối & Chia Lead (crm.manage)', desc: 'Thu hồi, chia lại lead tồn, chỉnh sửa quy tắc SLA & Round-robin', granted: true },
      { name: 'Toàn quyền Pipeline CRM (crm.work)', desc: 'Xem toàn bộ dữ liệu khách hàng, mọi giai đoạn và phễu bán', granted: true },
      { name: 'Xem Báo cáo Doanh số & KPI', desc: 'Theo dõi chỉ số chốt deal của từng nhân viên & toàn cơ sở', granted: true },
      { name: 'Duyệt Huỷ / Giảm giá (billing.refund)', desc: 'Quyền phê duyệt chiết khấu đặc biệt cho khách VIP', granted: true },
      { name: 'Nghiệp vụ Bán hàng & Đặt line', desc: 'Toàn bộ thao tác tạo đơn, mở phòng và book lịch', granted: true },
    ],
  },
  cashier: {
    label: 'Thu ngân quầy',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    description: 'Thực hiện thanh toán tại quầy lễ tân, hỗ trợ check-in và nhận đặt cọc.',
    capabilities: [
      { name: 'Thu tiền & Đóng ca (finance.operate)', desc: 'Thu tiền mặt, chuyển khoản Sepay, in hóa đơn ca trực', granted: true },
      { name: 'Check-in & Vận hành line (session.operate)', desc: 'Bật máy 3D, mở phòng Foresight cho khách', granted: true },
      { name: 'Bán thẻ & Gói tập (member.sell)', desc: 'Thu tiền gia hạn thẻ hội viên tại quầy', granted: true },
      { name: 'Đặt đồ F&B tại quầy (fnb.order)', desc: 'Quản lý đồ uống và thiết bị cho mượn', granted: true },
    ],
  },
};

function Switch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <label className="crm-switch-wrap" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox"
        className="crm-switch-input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="crm-switch-slider" style={{ borderRadius: '5px' }} />
    </label>
  );
}

export function SalesStaffManager({
  s,
  setS,
  data,
  reload,
}: {
  s: SalesConfig['settings'];
  setS: (s: SalesConfig['settings']) => void;
  data: SalesConfig;
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<(Staff & StaffExtra) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [secretModal, setSecretModal] = useState<{ who: string; email: string; password: string; isNew?: boolean } | null>(null);

  // Form states
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Add form fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'sale' | 'cskh' | 'manager'>('sale');
  const [newIsLeader, setNewIsLeader] = useState(false);
  const [newTeam, setNewTeam] = useState('Sales 1');
  const [newExtension, setNewExtension] = useState('');
  const [newZaloId, setNewZaloId] = useState('');
  const [newNotifyEmail, setNewNotifyEmail] = useState('');
  const [newReceiveLeads, setNewReceiveLeads] = useState(true);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'sale' | 'cskh' | 'manager' | 'cashier'>('sale');
  const [editIsLeader, setEditIsLeader] = useState(false);
  const [editTeam, setEditTeam] = useState('');
  const [editExtension, setEditExtension] = useState('');
  const [editZaloId, setEditZaloId] = useState('');
  const [editNotifyEmail, setEditNotifyEmail] = useState('');
  const [editReceiveLeads, setEditReceiveLeads] = useState(true);
  const [editActive, setEditActive] = useState(true);

  const paused = (s.distribution as { paused: string[] }).paused || [];

  const extraMap = useMemo(() => {
    const map = new Map<string, StaffExtra>();
    for (const x of data.staffExtra) {
      map.set(x.userId, x);
    }
    return map;
  }, [data.staffExtra]);

  const teams = useMemo(() => {
    const set = new Set<string>();
    for (const x of data.staffExtra) {
      if (x.team && x.team.trim()) set.add(x.team.trim());
    }
    return Array.from(set).sort();
  }, [data.staffExtra]);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] || 'S').toUpperCase();
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. CREATE SALE
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('err', 'Vui lòng nhập họ tên và email làm việc.');
      return;
    }
    setBusy(true);
    try {
      const res = await call<{ ok: boolean; id: string; temporaryPassword?: string }>('/api/crm2/config', {
        action: 'create_sale',
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        password: newPassword.trim() || undefined,
        isLeader: newIsLeader,
        team: newTeam.trim(),
        extension: newExtension.trim(),
        zaloId: newZaloId.trim(),
        notifyEmail: newNotifyEmail.trim(),
        receiveLeads: newReceiveLeads,
      });

      await reload();
      setIsAddOpen(false);

      if (res.temporaryPassword) {
        setSecretModal({
          who: newName.trim(),
          email: newEmail.trim(),
          password: res.temporaryPassword,
          isNew: true,
        });
      } else {
        showToast('ok', `Đã thêm nhân viên ${newName.trim()} thành công.`);
      }

      // Reset add form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('sale');
      setNewIsLeader(false);
      setNewTeam('Sales 1');
      setNewExtension('');
      setNewZaloId('');
      setNewNotifyEmail('');
      setNewReceiveLeads(true);
    } catch (err) {
      showToast('err', errText(err));
    } finally {
      setBusy(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const openEdit = (m: Staff) => {
    const x = extraMap.get(m.id) || {
      userId: m.id,
      team: '',
      isLeader: 0,
      extension: '',
      zaloId: '',
      notifyEmail: '',
    };
    setEditStaff({ ...m, ...x });
    setEditName(m.name);
    setEditRole((m.role as 'sale' | 'cskh' | 'manager' | 'cashier') || 'sale');
    setEditIsLeader(!!x.isLeader);
    setEditTeam(x.team || '');
    setEditExtension(x.extension || '');
    setEditZaloId(x.zaloId || '');
    setEditNotifyEmail(x.notifyEmail || '');
    setEditReceiveLeads(!paused.includes(m.id));
    setEditActive(m.active !== false);
  };

  // 3. SUBMIT EDIT
  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    setBusy(true);
    try {
      await call('/api/crm2/config', {
        action: 'update_sale',
        userId: editStaff.id,
        name: editName.trim(),
        role: editRole,
        active: editActive,
        isLeader: editIsLeader,
        team: editTeam.trim(),
        extension: editExtension.trim(),
        zaloId: editZaloId.trim(),
        notifyEmail: editNotifyEmail.trim(),
        receiveLeads: editReceiveLeads,
      });

      await reload();
      setEditStaff(null);
      showToast('ok', `Đã cập nhật thông tin và phân quyền cho ${editName} thành công.`);
    } catch (err) {
      showToast('err', errText(err));
    } finally {
      setBusy(false);
    }
  };

  // 4. RESET PASSWORD
  const handleResetPassword = async (userId: string, who: string, email: string) => {
    if (!confirm(`Tạo mật khẩu ngẫu nhiên mới cho "${who}"? Mọi phiên đăng nhập hiện tại sẽ bị đăng xuất.`)) return;
    setBusy(true);
    try {
      const res = await call<{ temporaryPassword?: string }>('/api/crm2/config', {
        action: 'reset_password',
        userId,
      });
      if (res.temporaryPassword) {
        setSecretModal({
          who,
          email,
          password: res.temporaryPassword,
          isNew: false,
        });
      }
    } catch (err) {
      showToast('err', errText(err));
    } finally {
      setBusy(false);
    }
  };

  // 5. TOGGLE LOCK/UNLOCK
  const handleToggleLock = async (m: Staff) => {
    const nextActive = m.active === false;
    setBusy(true);
    try {
      await call('/api/crm2/config', {
        action: 'update_sale',
        userId: m.id,
        active: nextActive,
      });
      await reload();
      showToast('ok', nextActive ? `Đã kích hoạt lại tài khoản ${m.name}.` : `Đã tạm khóa tài khoản ${m.name}.`);
    } catch (err) {
      showToast('err', errText(err));
    } finally {
      setBusy(false);
    }
  };

  // 6. DELETE SALE
  const handleDeleteSale = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await call('/api/crm2/config', {
        action: 'delete_sale',
        userId: deleteTarget.id,
      });
      await reload();
      showToast('ok', `Đã xóa nhân viên ${deleteTarget.name} khỏi hệ thống.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast('err', errText(err));
    } finally {
      setBusy(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return data.staff.filter((m) => {
      const x = extraMap.get(m.id);
      const isLeader = x?.isLeader === 1;

      // Role filter
      if (roleFilter === 'leader' && !isLeader) return false;
      if (roleFilter !== 'all' && roleFilter !== 'leader' && m.role !== roleFilter) return false;

      // Team filter
      if (teamFilter !== 'all' && (x?.team || '') !== teamFilter) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        const matchExt = (x?.extension || '').toLowerCase().includes(q);
        const matchTeam = (x?.team || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchExt && !matchTeam) return false;
      }
      return true;
    });
  }, [data.staff, extraMap, roleFilter, teamFilter, search]);

  // KPIs
  const totalSales = data.staff.length;
  const receivingCount = data.staff.filter((m) => !paused.includes(m.id) && m.active !== false).length;
  const leaderCount = data.staff.filter((m) => extraMap.get(m.id)?.isLeader === 1).length;
  const lockedCount = data.staff.filter((m) => m.active === false).length;

  return (
    <div className="crm-sales-staff-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast message */}
      {msg && (
        <div
          className={`crm-toast-banner ${msg.type === 'ok' ? 'ok' : 'err'}`}
          style={{
            padding: '10px 14px',
            borderRadius: '5px',
            background: msg.type === 'ok' ? '#e8f5e9' : '#fee2e2',
            color: msg.type === 'ok' ? '#025c0a' : '#b91c1c',
            border: `1px solid ${msg.type === 'ok' ? '#a5d6a7' : '#f87171'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div
        className="crm-staff-kpis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
          gap: '12px',
        }}
      >
        <div
          className="crm-kpi-card"
          style={{
            background: '#ffffff',
            border: '1px solid #dde5de',
            borderRadius: '5px',
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng số nhân sự Sales
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#025c0a', marginTop: '4px' }}>{totalSales}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Tài khoản kinh doanh & CSKH</div>
        </div>

        <div
          className="crm-kpi-card"
          style={{
            background: '#ffffff',
            border: '1px solid #dde5de',
            borderRadius: '5px',
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Đang nhận lead tự động
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{receivingCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Trong hàng đợi Round-robin</div>
        </div>

        <div
          className="crm-kpi-card"
          style={{
            background: '#ffffff',
            border: '1px solid #dde5de',
            borderRadius: '5px',
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Trưởng nhóm kinh doanh
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{leaderCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Trưởng nhóm theo dõi KPI</div>
        </div>

        <div
          className="crm-kpi-card"
          style={{
            background: '#ffffff',
            border: '1px solid #dde5de',
            borderRadius: '5px',
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Tạm khóa tài khoản
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: lockedCount > 0 ? '#dc2626' : '#64748b',
              marginTop: '4px',
            }}
          >
            {lockedCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Đã thu hồi quyền đăng nhập</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div
        className="crm-staff-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: '#ffffff',
          padding: '12px 14px',
          border: '1px solid #dde5de',
          borderRadius: '5px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', flex: 1 }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '220px', maxWidth: '320px', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input
              type="search"
              placeholder="Tìm tên, email, máy lẻ, nhóm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-staff-input"
              style={{
                width: '100%',
                paddingLeft: '32px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                height: '34px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Filter by Team */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            style={{
              height: '34px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              padding: '0 10px',
              fontSize: '13px',
              background: '#ffffff',
              color: '#334155',
            }}
          >
            <option value="all">Tất cả nhóm ({teams.length ? `${teams.length} nhóm` : 'Toàn đội'})</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                Nhóm: {t}
              </option>
            ))}
          </select>

          {/* Filter by Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: '34px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              padding: '0 10px',
              fontSize: '13px',
              background: '#ffffff',
              color: '#334155',
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="sale">Tư vấn Sale</option>
            <option value="cskh">CSKH & Telesales</option>
            <option value="leader">⭐ Trưởng nhóm (Leader)</option>
            <option value="manager">Quản lý kinh doanh</option>
          </select>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          style={{
            background: '#025c0a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2,92,10,0.25)',
          }}
        >
          <UserPlus size={15} /> Thêm nhân sự Sale
        </button>
      </div>

      {/* Main Staff Table */}
      <div className="crm-staff-table-wrap" style={{ borderRadius: '5px', overflowX: 'auto', background: '#ffffff' }}>
        <table className="crm-staff-modern" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8faf9', borderBottom: '1px solid #dde5de' }}>
              <th style={{ width: '24%', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Nhân viên Sales
              </th>
              <th style={{ width: '18%', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Vai trò & Phân quyền
              </th>
              <th style={{ width: '14%', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Nhóm & Máy lẻ
              </th>
              <th
                style={{
                  width: '11%',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  textAlign: 'center',
                }}
              >
                Nhận lead
              </th>
              <th style={{ width: '15%', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Kênh liên lạc
              </th>
              <th
                style={{
                  width: '10%',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  textAlign: 'center',
                }}
              >
                Trạng thái
              </th>
              <th
                style={{
                  width: '8%',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  textAlign: 'right',
                }}
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                  <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>Không tìm thấy nhân viên Sales phù hợp với bộ lọc.</div>
                </td>
              </tr>
            ) : (
              filteredList.map((m) => {
                const x = extraMap.get(m.id) || {
                  userId: m.id,
                  team: '',
                  isLeader: 0,
                  extension: '',
                  zaloId: '',
                  notifyEmail: '',
                };
                const isReceiving = !paused.includes(m.id);
                const isActive = m.active !== false;
                const isLeader = x.isLeader === 1;
                const roleInfo = ROLE_DETAILS[m.role] || {
                  label: m.role,
                  badgeBg: '#f1f5f9',
                  badgeColor: '#475569',
                  capabilities: [],
                };

                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid #f1f4f2',
                      background: !isActive ? '#fafafa' : undefined,
                    }}
                  >
                    {/* 1. Member profile */}
                    <td style={{ padding: '10px 12px' }}>
                      <div className="crm-staff-user" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="crm-staff-avatar"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '5px',
                            background: isLeader ? '#fef3c7' : '#e8f5e9',
                            color: isLeader ? '#b45309' : '#025c0a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0,
                            border: `1px solid ${isLeader ? '#f5af05' : '#a5d6a7'}`,
                          }}
                        >
                          {getInitials(m.name)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13.5px', color: isActive ? '#1e293b' : '#94a3b8' }}>
                              {m.name}
                            </strong>
                            {isLeader && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  border: '1px solid #fde68a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Award size={10} /> Trưởng nhóm
                              </span>
                            )}
                          </div>
                          <small style={{ fontSize: '11px', color: '#64748b' }}>{m.email}</small>
                        </div>
                      </div>
                    </td>

                    {/* 2. Role & Permissions */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: roleInfo.badgeBg,
                              color: roleInfo.badgeColor,
                              padding: '2px 8px',
                              borderRadius: '5px',
                              display: 'inline-block',
                            }}
                          >
                            {m.role === 'sale'
                              ? 'Tư vấn Sale'
                              : m.role === 'cskh'
                              ? 'CSKH & Telesales'
                              : m.role === 'manager'
                              ? 'Quản lý kinh doanh'
                              : m.role === 'owner'
                              ? 'Chủ cơ sở'
                              : 'Thu ngân'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            🎯 Lead
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            🎫 Bán thẻ
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            ⛳ Line 3D
                          </span>
                          {m.role === 'manager' && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              👑 Quản trị
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Team & Extension */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>
                        {x.team || <span style={{ color: '#94a3b8' }}>Chưa chia nhóm</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Máy lẻ:{' '}
                        {x.extension ? (
                          <strong style={{ color: '#025c0a' }}>#{x.extension}</strong>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Chưa gán</span>
                        )}
                      </div>
                    </td>

                    {/* 4. Auto Lead Round-robin Switch */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <Switch
                          checked={isReceiving && isActive}
                          disabled={busy || !isActive}
                          aria-label={`Bật/tắt nhận lead: ${m.name}`}
                          onChange={(checked) =>
                            setS({
                              ...s,
                              distribution: {
                                ...(s.distribution as object),
                                paused: checked ? paused.filter((id) => id !== m.id) : [...paused, m.id],
                              },
                            })
                          }
                        />
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: isReceiving && isActive ? '#16a34a' : '#94a3b8',
                          }}
                        >
                          {isReceiving && isActive ? 'Đang nhận' : 'Tạm dừng'}
                        </span>
                      </div>
                    </td>

                    {/* 5. Contact Channels */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        <div style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#0068ff', fontWeight: 700 }}>Zalo:</span>
                          <span>{x.zaloId || <span style={{ color: '#94a3b8' }}>—</span>}</span>
                        </div>
                        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} style={{ opacity: 0.7 }} />
                          <span
                            style={{
                              maxWidth: '130px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={x.notifyEmail || m.email}
                          >
                            {x.notifyEmail || m.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 6. Active Status */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          display: 'inline-block',
                          background: isActive ? '#e8f5e9' : '#fee2e2',
                          color: isActive ? '#025c0a' : '#b91c1c',
                        }}
                      >
                        {isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>

                    {/* 7. Action Buttons */}
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {/* Edit & Permissions */}
                        <button
                          type="button"
                          className="secondary"
                          title="Sửa thông tin & Phân quyền vai trò"
                          onClick={() => openEdit(m)}
                          style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                          }}
                        >
                          <Edit3 size={13} style={{ color: '#025c0a' }} /> Sửa
                        </button>

                        {/* Reset password */}
                        <button
                          type="button"
                          className="secondary"
                          title="Tạo lại mật khẩu ngẫu nhiên"
                          onClick={() => handleResetPassword(m.id, m.name, m.email)}
                          style={{
                            padding: '5px 7px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                          }}
                        >
                          <KeyRound size={13} style={{ color: '#b45309' }} />
                        </button>

                        {/* Lock / Unlock */}
                        {m.id !== data.me && m.role !== 'owner' && (
                          <button
                            type="button"
                            className="secondary"
                            title={isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            onClick={() => handleToggleLock(m)}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                            }}
                          >
                            {isActive ? (
                              <Lock size={13} style={{ color: '#64748b' }} />
                            ) : (
                              <Unlock size={13} style={{ color: '#16a34a' }} />
                            )}
                          </button>
                        )}

                        {/* Delete */}
                        {m.id !== data.me && m.role !== 'owner' && (
                          <button
                            type="button"
                            className="secondary"
                            title="Xóa nhân viên khỏi hệ thống"
                            onClick={() => setDeleteTarget(m)}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '5px',
                              border: '1px solid #fecaca',
                              background: '#fff5f5',
                            }}
                          >
                            <Trash2 size={13} style={{ color: '#dc2626' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
        💡 <strong>Mẹo vận hành:</strong> Bấm <em>Sửa</em> để phân quyền vai trò chi tiết, cập nhật máy lẻ tổng đài, ID Zalo OA và trạng thái tiếp nhận Lead tự động. Để lưu hàng loạt thay đổi nhanh về Nhận lead, bấm nút <em>Lưu cấu hình (Ctrl+S)</em> ở đầu trang.
      </p>

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM NHÂN SỰ SALE MỚI */}
      {/* ========================================================================= */}
      {isAddOpen && (
        <div
          className="crm-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 11, 7, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="crm-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '5px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #dde5de',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8faf9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '5px',
                    background: '#e8f5e9',
                    color: '#025c0a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Thêm nhân sự Sale & Phân quyền
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Tạo tài khoản kinh doanh, gán vai trò & cấu hình kênh tiếp nhận lead
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSale} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Name & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Họ và tên nhân viên <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    minLength={2}
                    placeholder="VD: Nguyễn Thuỳ Trang"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Email làm việc (Đăng nhập) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="VD: trang.nguyen@saigongolf.vn"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Initial Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Mật khẩu khởi tạo (Để trống nếu muốn tự sinh ngẫu nhiên)
                </label>
                <input
                  type="text"
                  placeholder="Để trống sẽ tự tạo mật khẩu mạnh ngẫu nhiên"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Row 3: Role Selection with Visual Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Vai trò kinh doanh & Quyền hạn hệ thống <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { key: 'sale', label: 'Tư vấn Sale', sub: 'Tiếp nhận lead, chốt gói & đặt sân' },
                    { key: 'cskh', label: 'CSKH & Telesales', sub: 'Chăm sóc hội viên, gọi telesale' },
                    { key: 'manager', label: 'Quản lý kinh doanh', sub: 'Toàn quyền CRM & chia lead' },
                  ].map((r) => {
                    const active = newRole === r.key;
                    return (
                      <div
                        key={r.key}
                        onClick={() => setNewRole(r.key as 'sale' | 'cskh' | 'manager')}
                        style={{
                          border: `1.5px solid ${active ? '#025c0a' : '#e2e8f0'}`,
                          background: active ? '#f0fdf4' : '#ffffff',
                          borderRadius: '5px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: active ? '#025c0a' : '#1e293b' }}>
                            {r.label}
                          </span>
                          {active && <Check size={14} style={{ color: '#025c0a' }} />}
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{r.sub}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leader Switch & Team */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  padding: '12px',
                  background: '#f8faf9',
                  borderRadius: '5px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Nhóm bán hàng (Team)
                  </label>
                  <input
                    placeholder="VD: Sales 1, VIP Club, Morning..."
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                      Đánh dấu Trưởng nhóm (Leader)
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Có quyền xem báo cáo & điều phối nhóm
                    </div>
                  </div>
                  <Switch checked={newIsLeader} onChange={setNewIsLeader} />
                </div>
              </div>

              {/* Channels: Extension, Zalo, Notification Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Máy lẻ tổng đài
                  </label>
                  <input
                    placeholder="VD: 101"
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Zalo OA User ID
                  </label>
                  <input
                    placeholder="VD: oa_user_123"
                    value={newZaloId}
                    onChange={(e) => setNewZaloId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Email nhận báo lead
                  </label>
                  <input
                    type="email"
                    placeholder="Mặc định dùng email đăng nhập"
                    value={newNotifyEmail}
                    onChange={(e) => setNewNotifyEmail(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Auto Lead Receive Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '5px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    Bật nhận Lead tự động (Round-robin)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Ngay khi tạo, nhân viên sẽ được tham gia vòng quay chia lead từ Website & Ads
                  </div>
                </div>
                <Switch checked={newReceiveLeads} onChange={setNewReceiveLeads} />
              </div>

              {/* Capabilities Checklist Preview */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '12px', background: '#ffffff' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#025c0a' }} />
                  Quyền hạn cấp cho vai trò: {ROLE_DETAILS[newRole]?.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {ROLE_DETAILS[newRole]?.capabilities.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        fontSize: '11px',
                        color: c.granted ? '#1e293b' : '#94a3b8',
                      }}
                    >
                      {c.granted ? (
                        <Check size={13} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <X size={13} style={{ color: '#cbd5e1', flexShrink: 0, marginTop: 1 }} />
                      )}
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    background: '#025c0a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UserPlus size={15} /> {busy ? 'Đang tạo...' : 'Tạo nhân sự Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SỬA THÔNG TIN & PHÂN QUYỀN VAI TRÒ */}
      {/* ========================================================================= */}
      {editStaff && (
        <div
          className="crm-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 11, 7, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="crm-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '5px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #dde5de',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8faf9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '5px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Chỉnh sửa & Phân quyền: {editStaff.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{editStaff.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditStaff(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateSale} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Name & Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Họ và tên nhân viên
                  </label>
                  <input
                    required
                    minLength={2}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Vai trò hệ thống & Phân quyền
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'sale' | 'cskh' | 'manager' | 'cashier')}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="sale">Nhân viên Sale (Tư vấn bán hàng)</option>
                    <option value="cskh">CSKH & Telesales</option>
                    <option value="manager">Quản lý kinh doanh (Sales Manager)</option>
                    <option value="cashier">Thu ngân quầy</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Team & Leader switch */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  padding: '12px',
                  background: '#f8faf9',
                  borderRadius: '5px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Nhóm bán hàng (Team)
                  </label>
                  <input
                    placeholder="VD: Sales 1, VIP Club..."
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                      Trưởng nhóm kinh doanh (Leader)
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Theo dõi tiến độ & điều phối lead nhóm
                    </div>
                  </div>
                  <Switch checked={editIsLeader} onChange={setEditIsLeader} />
                </div>
              </div>

              {/* Channels: Extension, Zalo, Notification Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Máy lẻ tổng đài
                  </label>
                  <input
                    placeholder="VD: 101"
                    value={editExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Zalo OA User ID
                  </label>
                  <input
                    placeholder="VD: oa_user_123"
                    value={editZaloId}
                    onChange={(e) => setEditZaloId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Email nhận báo lead
                  </label>
                  <input
                    type="email"
                    placeholder="Để trống dùng email đăng nhập"
                    value={editNotifyEmail}
                    onChange={(e) => setEditNotifyEmail(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Status & Receive Lead switches */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '5px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                      Nhận Lead tự động
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Hàng đợi Round-robin</div>
                  </div>
                  <Switch checked={editReceiveLeads} onChange={setEditReceiveLeads} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '5px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                      Trạng thái hoạt động
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Cho phép đăng nhập</div>
                  </div>
                  <Switch
                    checked={editActive}
                    disabled={editStaff.id === data.me || editStaff.role === 'owner'}
                    onChange={setEditActive}
                  />
                </div>
              </div>

              {/* Capabilities description */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '12px', background: '#ffffff' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#025c0a' }} />
                  Chi tiết phân quyền của vai trò: {ROLE_DETAILS[editRole]?.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {ROLE_DETAILS[editRole]?.capabilities.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        fontSize: '11px',
                        color: c.granted ? '#1e293b' : '#94a3b8',
                      }}
                    >
                      {c.granted ? (
                        <Check size={13} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <X size={13} style={{ color: '#cbd5e1', flexShrink: 0, marginTop: 1 }} />
                      )}
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleResetPassword(editStaff.id, editStaff.name, editStaff.email)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '5px',
                    border: '1px solid #fde68a',
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <KeyRound size={13} /> Cấp lại mật khẩu mới
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditStaff(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '5px',
                      border: 'none',
                      background: '#025c0a',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Check size={15} /> {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA NHÂN SỰ AN TOÀN */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          className="crm-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 11, 7, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="crm-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '5px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #fecaca',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '5px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>
                  Xác nhận xóa nhân sự
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Hành động này không thể hoàn tác</div>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Bạn có chắc chắn muốn xóa nhân viên <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) khỏi đội ngũ Sales và hệ thống câu lạc bộ?
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '5px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#b91c1c',
                marginBottom: '20px',
              }}
            >
              ⚠️ Tài khoản sẽ bị thu hồi quyền truy cập ngay lập tức, bị loại khỏi hàng đợi chia lead tự động và ngắt mọi phiên đăng nhập đang hoạt động.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteSale}
                style={{
                  padding: '8px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={15} /> {busy ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: POPUP CẤP MẬT KHẨU TẠM THỜI (1-CLICK COPY) */}
      {/* ========================================================================= */}
      {secretModal && (
        <div
          className="crm-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 11, 7, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="crm-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '5px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #fef08a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '5px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                  {secretModal.isNew ? 'Đã tạo tài khoản Sales thành công' : 'Đã cấp lại mật khẩu thành công'}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Nhân sự: {secretModal.who}</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '12px' }}>
              Email đăng nhập: <strong>{secretModal.email}</strong>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '5px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Mật khẩu khởi tạo
                </div>
                <code style={{ fontSize: '18px', fontWeight: 800, color: '#025c0a', letterSpacing: '1px' }}>
                  {secretModal.password}
                </code>
              </div>
              <button
                type="button"
                onClick={() => handleCopyPassword(secretModal.password)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: copied ? '#e8f5e9' : '#ffffff',
                  color: copied ? '#025c0a' : '#1e293b',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              🔒 <strong>Lưu ý bảo mật:</strong> Mật khẩu chỉ hiển thị một lần duy nhất tại đây. Hãy gửi thông tin đăng nhập cho nhân sự. Hệ thống sẽ tự động yêu cầu nhân sự đổi mật khẩu mới trong lần đăng nhập đầu tiên.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSecretModal(null)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '5px',
                  border: 'none',
                  background: '#025c0a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
