'use client';
import { useState, useMemo, useCallback } from 'react';
import { Sliders } from 'lucide-react';
import { DataTable, KpiTile, Loading, StatusBadge } from '../../../app/ui/kit';
import { call, errText, stamp, type Lead, type Staff } from './api';
import { useLoad, type Shared } from './Screens';
import { STAGE_LABELS, type Stage } from '../core/stages';

type DistributionTab = 'unassigned' | 'assigned' | 'existing' | 'repeated' | 'care';

export function LeadDistributionScreen({ s }: { s: Shared }) {
  const [tab, setTab] = useState<DistributionTab>('unassigned');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetStaff, setTargetStaff] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  // Load leads
  const { data, error, reload } = useLoad<{ leads: Lead[]; total: number }>(
    '/api/crm2/leads?limit=300',
    20_000,
  );

  // Load settings for auto distribution rules
  const { data: configData, reload: reloadConfig } = useLoad<{
    settings: {
      distribution: {
        mode: 'FAIR' | 'WEIGHTED';
        weights: Record<string, number>;
        paused: string[];
        returnToPrevious: boolean;
      };
      pool: {
        intakeMode: 'AUTO' | 'POOL';
        recallHours: number;
        autoRecall: boolean;
      };
      slaMinutes: number;
    };
    staff: Staff[];
  }>('/api/crm2/config');

  const leads = useMemo(() => data?.leads ?? [], [data?.leads]);
  const staffList = useMemo(() => configData?.staff ?? [], [configData?.staff]);
  const salesStaff = useMemo(
    () => staffList.filter((st) => ['sale', 'cskh', 'manager', 'owner'].includes(st.role)),
    [staffList],
  );

  // Categorize 5 data groups according to SandboxVN specs:
  // 1. Chưa chia: owner is null and not won/lost
  // 2. Đã chia: owner is not null and not won/lost
  // 3. Khách cũ: has previous history or is existing customer
  // 4. Về lại (trùng số): inquiryCount > 1
  // 5. Chăm sóc: stage === 'WON'
  const groups = useMemo(() => {
    const unassigned: Lead[] = [];
    const assigned: Lead[] = [];
    const existing: Lead[] = [];
    const repeated: Lead[] = [];
    const care: Lead[] = [];

    for (const l of leads) {
      if (l.stage === 'WON') {
        care.push(l);
      }
      if (l.inquiryCount > 1) {
        repeated.push(l);
      }
      if (l.notes?.toLowerCase().includes('khách cũ') || l.source?.toLowerCase().includes('khách cũ')) {
        existing.push(l);
      }
      if (!l.owner && l.stage !== 'WON' && l.stage !== 'LOST') {
        unassigned.push(l);
      } else if (l.owner && l.stage !== 'WON' && l.stage !== 'LOST') {
        assigned.push(l);
      }
    }

    return { unassigned, assigned, existing, repeated, care };
  }, [leads]);

  const currentList = useMemo(() => {
    switch (tab) {
      case 'unassigned':
        return groups.unassigned;
      case 'assigned':
        return groups.assigned;
      case 'existing':
        return groups.existing;
      case 'repeated':
        return groups.repeated;
      case 'care':
        return groups.care;
      default:
        return groups.unassigned;
    }
  }, [tab, groups]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((l) => l.id));
    }
  }, [selectedIds, currentList]);

  // Bulk assign
  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 khách hàng');
      return;
    }
    if (!targetStaff) {
      alert('Vui lòng chọn nhân viên tiếp nhận');
      return;
    }
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await call('/api/crm2/leads', {
        action: 'assign',
        ids: selectedIds,
        userId: targetStaff,
      });
      setMsg(`Đã phân công ${selectedIds.length} lead cho nhân viên thành công!`);
      setSelectedIds([]);
      await reload();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  // Bulk recall
  const handleRecall = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 khách hàng');
      return;
    }
    const reason = prompt('Nhập lý do thu hồi về kho số:', 'Quản lý thu hồi để chia lại');
    if (!reason) return;
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await call('/api/crm2/leads', {
        action: 'recall',
        ids: selectedIds,
        reason,
      });
      setMsg(`Đã thu hồi ${selectedIds.length} lead về kho số thành công!`);
      setSelectedIds([]);
      await reload();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  // Update rule settings
  const handleSaveRules = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!configData?.settings) return;
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const form = e.currentTarget;
      const intakeMode = ((form.elements.namedItem('intakeMode') as unknown as HTMLSelectElement)?.value ?? 'AUTO') as 'AUTO' | 'POOL';
      const returnToPrevious = (form.elements.namedItem('returnToPrevious') as unknown as HTMLInputElement)?.checked ?? true;
      const slaMinutes = Number((form.elements.namedItem('slaMinutes') as unknown as HTMLInputElement)?.value) || 15;

      const nextSettings = {
        ...configData.settings,
        pool: {
          ...configData.settings.pool,
          intakeMode,
        },
        distribution: {
          ...configData.settings.distribution,
          returnToPrevious,
        },
        slaMinutes,
      };

      await call('/api/crm2/config', { settings: nextSettings });
      setMsg('Đã lưu cấu hình luật chia lead thành công!');
      setShowConfig(false);
      await reloadConfig();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <div className="error-box" role="alert">{error}</div>;
  if (!data) return <Loading />;

  const distMode = configData?.settings?.pool?.intakeMode ?? 'AUTO';
  const returnPrev = configData?.settings?.distribution?.returnToPrevious ?? true;
  const slaMin = configData?.settings?.slaMinutes ?? 15;

  const totalLeads = leads.length;
  const autoAssignedRate = totalLeads > 0 ? Math.round((groups.assigned.length / totalLeads) * 100) : 0;

  const columns = [
    {
      key: 'sel',
      header: 'Chọn',
      cell: (r: Lead) => (
        <input
          type="checkbox"
          aria-label={`Chọn ${r.fullName}`}
          checked={selectedIds.includes(r.id)}
          onChange={() => toggleSelect(r.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'name',
      header: 'Khách hàng',
      cell: (r: Lead) => (
        <div>
          <strong style={{ fontSize: 14 }}>{r.fullName}</strong>
          <div style={{ color: '#64748b', fontSize: 13 }}>{r.phone}</div>
          {r.inquiryCount > 1 && (
            <span
              className="crm-chip"
              style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, margin: '2px 0 0 0' }}
            >
              Về lại lần {r.inquiryCount}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Nguồn & Dịch vụ',
      cell: (r: Lead) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.source || 'Website'}</div>
          <div style={{ fontSize: 12, color: '#0284c7' }}>{r.targetService || 'Gói tập / Trải nghiệm'}</div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Nhân sự phụ trách',
      cell: (r: Lead) => {
        const staff = staffList.find((st) => st.id === r.owner);
        if (!staff) {
          return (
            <span
              className="crm-chip"
              style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 11, fontWeight: 600 }}
            >
              Chưa chia
            </span>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0369a1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {staff.name.charAt(0).toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{staff.name}</span>
          </div>
        );
      },
    },
    {
      key: 'stage',
      header: 'Trạng thái & Hạn',
      cell: (r: Lead) => (
        <div>
          <StatusBadge tone={r.stage === 'WON' ? 'ok' : r.stage === 'LOST' ? 'muted' : 'info'}>
            {STAGE_LABELS[r.stage as Stage] || r.stage}
          </StatusBadge>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {stamp(r.created)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      cell: (r: Lead) => (
        <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="secondary"
            style={{ height: 30, padding: '0 8px', fontSize: 12 }}
            onClick={() => s.open(r.id)}
          >
            Chi tiết
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Top Banner KPI SandboxVN */}
      <section className="ds-tiles" aria-label="Bảng điều khiển máy chia lead">
        <KpiTile label="Tổng data trong kỳ" value={totalLeads} />
        <KpiTile
          label="Chưa chia"
          value={groups.unassigned.length}
          hint={groups.unassigned.length > 0 ? 'Cần chia ngay' : 'Đã phân phối hết'}
        />
        <KpiTile label="Đã chia cho Sale" value={groups.assigned.length} hint={`Tỷ lệ tự động: ${autoAssignedRate}%`} />
        <KpiTile label="Về lại (trùng số)" value={groups.repeated.length} hint="Gửi nhiều lần" />
        <KpiTile label="Khách chốt / CSKH" value={groups.care.length} />
      </section>

      {err && <div className="error-box" role="alert">{err}</div>}
      {msg && <div role="status" className="notice-box" style={{ background: '#f0fdf4', color: '#166534', padding: '8px 12px', borderRadius: 6 }}>{msg}</div>}

      {/* 5 SandboxVN Categorization Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'unassigned', label: 'Chưa chia', count: groups.unassigned.length, isWarning: groups.unassigned.length > 0 },
            { key: 'assigned', label: 'Đã chia', count: groups.assigned.length },
            { key: 'repeated', label: 'Về lại (trùng số)', count: groups.repeated.length },
            { key: 'existing', label: 'Khách cũ', count: groups.existing.length },
            { key: 'care', label: 'Chăm sóc sau bán', count: groups.care.length },
          ].map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key as DistributionTab);
                  setSelectedIds([]);
                }}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: active ? '1px solid #16a34a' : '1px solid #e2e8f0',
                  background: active ? '#f0fdf4' : '#ffffff',
                  color: active ? '#15803d' : '#334155',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: item.isWarning ? '#fef3c7' : active ? '#dcfce7' : '#f1f5f9',
                    color: item.isWarning ? '#b45309' : active ? '#166534' : '#64748b',
                  }}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="secondary"
            onClick={selectAll}
            style={{ height: 38, fontSize: 13 }}
          >
            {selectedIds.length === currentList.length && currentList.length > 0 ? 'Bỏ chọn hết' : 'Chọn tất cả'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowConfig(!showConfig)}
            style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Sliders size={15} /> Thiết lập chia lead
          </button>
        </div>
      </div>

      {/* Rules Configuration Panel */}
      {showConfig && (
        <form
          onSubmit={handleSaveRules}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            display: 'grid',
            gap: 14,
          }}
        >
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={16} /> Thiết lập máy chia lead tự động
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <strong>Chế độ tiếp nhận (Intake Mode)</strong>
              <select name="intakeMode" defaultValue={distMode} style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <option value="AUTO">Tự động chia ngay cho Sales (Round-Robin)</option>
                <option value="POOL">Đưa vào Kho số thả nổi (Nhân viên tự nhận)</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <strong>SLA phản hồi lần 1 (Phút)</strong>
              <input
                type="number"
                name="slaMinutes"
                defaultValue={slaMin}
                min={1}
                max={120}
                style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 22 }}>
              <input type="checkbox" name="returnToPrevious" defaultChecked={returnPrev} />
              <span>Ưu tiên trả <strong>Khách cũ</strong> về cho nhân viên sale cũ</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary" onClick={() => setShowConfig(false)}>
              Hủy
            </button>
            <button type="submit" className="primary" disabled={busy}>
              Lưu thiết lập
            </button>
          </div>
        </form>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
            Đang chọn {selectedIds.length} khách hàng
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={targetStaff}
              onChange={(e) => setTargetStaff(e.target.value)}
              style={{ height: 34, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, padding: '0 8px' }}
            >
              <option value="">-- Chọn nhân viên tiếp nhận --</option>
              {salesStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>

            <button
              type="button"
              className="primary"
              onClick={handleAssign}
              disabled={busy || !targetStaff}
              style={{ height: 34, fontSize: 13, padding: '0 12px' }}
            >
              Giao cho nhân viên
            </button>

            <button
              type="button"
              className="secondary"
              onClick={handleRecall}
              disabled={busy}
              style={{ height: 34, fontSize: 13, padding: '0 12px', color: '#dc2626' }}
            >
              Thu hồi về kho số
            </button>
          </div>
        </div>
      )}

      {/* Main Leads Table */}
      <DataTable
        label="Danh sách chia lead"
        rows={currentList}
        rowKey={(r) => r.id}
        empty="Không có dữ liệu trong mục này"
        emptyText="Các lead mới hoặc thuộc danh mục này sẽ xuất hiện tại đây."
        onRowClick={(r) => s.open(r.id)}
        columns={columns}
      />
    </div>
  );
}
