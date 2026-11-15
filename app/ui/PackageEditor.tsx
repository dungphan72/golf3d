'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Layers,
  Package,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { GRANT_KINDS, KIND_LABELS, UNLIMITED, type Grant, type GrantKind } from '../../lib/member';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { DataTable, askConfirm } from './kit';

export type EditablePackage = {
  id: string;
  name: string;
  price: number;
  grants: string;
  valid_days: number;
  perks: string;
  section?: string;
  room?: string;
  active: number;
};

type GrantState = Record<GrantKind, { on: boolean; qty: string; unlimited: boolean }>;

function startGrants(json?: string): GrantState {
  let list: Grant[] = [];
  if (json) {
    try {
      list = JSON.parse(json) as Grant[];
    } catch {
      list = [];
    }
  }
  const state = {} as GrantState;
  for (const kind of GRANT_KINDS) {
    const found = list.find((g) => g.kind === kind);
    state[kind] = {
      on: !!found,
      qty: found && found.qty < UNLIMITED ? String(found.qty) : '',
      unlimited: !!found && found.qty >= UNLIMITED,
    };
  }
  return state;
}

export const formatGrantsSummary = (json: string) => {
  try {
    return (JSON.parse(json) as Grant[])
      .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
      .join(' + ');
  } catch {
    return json;
  }
};

const QUICK_TEMPLATES: {
  label: string;
  name: string;
  price: number;
  days: number;
  section: string;
  room: 'any' | 'standard' | 'vip';
  perks: string;
  grants: Grant[];
}[] = [
  {
    label: 'Gói 10 Giờ',
    name: 'Gói Trải Nghiệm · 10 giờ',
    price: 3_200_000,
    days: 60,
    section: 'Gói giờ chơi',
    room: 'standard',
    perks: 'Tặng kèm +1 giờ tập · Miễn phí gậy tiêu chuẩn',
    grants: [{ kind: 'gdr', qty: 11 }],
  },
  {
    label: 'Gói 25 Giờ',
    name: 'Gói Tiêu Chuẩn · 25 giờ',
    price: 7_500_000,
    days: 90,
    section: 'Gói giờ chơi',
    room: 'any',
    perks: 'Tặng kèm +3 giờ tập · Giảm 10% F&B',
    grants: [{ kind: 'gdr', qty: 28 }],
  },
  {
    label: 'Gói 50 Giờ VIP',
    name: 'Gói Golfer Thân Thiết · 50 giờ',
    price: 14_000_000,
    days: 180,
    section: 'Gói giờ chơi',
    room: 'vip',
    perks: 'Tặng kèm +8 giờ tập · Sử dụng phòng VIP · Giảm 15% F&B',
    grants: [{ kind: 'gdr', qty: 58 }],
  },
  {
    label: 'Thẻ 1 Tháng',
    name: 'Thẻ tháng · 1 tháng',
    price: 5_000_000,
    days: 30,
    section: 'Thẻ tháng',
    room: 'any',
    perks: 'Không giới hạn giờ chơi · thời hạn tính từ ngày kích hoạt thẻ',
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
  },
  {
    label: 'Thẻ 3 Tháng',
    name: 'Thẻ tháng · 3 tháng',
    price: 14_000_000,
    days: 90,
    section: 'Thẻ tháng',
    room: 'any',
    perks: 'Không giới hạn giờ chơi · thời hạn tính từ ngày kích hoạt thẻ',
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
  },
  {
    label: 'Gói 10 Lượt 18 Hố',
    name: 'Gói 10 Lượt Golf 18 Hố',
    price: 4_500_000,
    days: 120,
    section: 'Gói lượt 9/18 hố',
    room: 'any',
    perks: 'Áp dụng mọi khung giờ · Chia sẻ tối đa 2 người chơi',
    grants: [{ kind: 'holes18', qty: 10 }],
  },
];

/** Create or edit a package. The public price page reads this catalogue, so a save here updates the website. */
export function PackageEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: EditablePackage | null;
  busy: boolean;
  onSave: (body: {
    id?: string;
    name: string;
    price: number;
    grants: Grant[];
    validDays: number;
    perks: string;
    section: string;
    room: 'any' | 'standard' | 'vip';
    active: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [days, setDays] = useState(initial ? String(initial.valid_days) : '90');
  const [perks, setPerks] = useState(initial?.perks ?? '');
  const [section, setSection] = useState(initial?.section ?? 'Gói giờ chơi');
  const [room, setRoom] = useState<'any' | 'standard' | 'vip'>(
    (initial?.room as 'any' | 'standard' | 'vip') ?? 'any',
  );
  const [active, setActive] = useState(initial ? !!initial.active : true);
  const [grants, setGrants] = useState<GrantState>(() =>
    initial?.grants
      ? startGrants(initial.grants)
      : startGrants(JSON.stringify([{ kind: 'gdr', qty: 10 }])),
  );
  const [error, setError] = useState('');

  function applyTemplate(tpl: (typeof QUICK_TEMPLATES)[number]) {
    setName(tpl.name);
    setPrice(String(tpl.price));
    setDays(String(tpl.days));
    setSection(tpl.section);
    setRoom(tpl.room);
    setPerks(tpl.perks);
    setGrants(startGrants(JSON.stringify(tpl.grants)));
    setError('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const list: Grant[] = [];
    for (const kind of GRANT_KINDS) {
      const g = grants[kind];
      if (!g.on) continue;
      const qty = g.unlimited ? UNLIMITED : Math.round(Number(g.qty));
      if (!Number.isFinite(qty) || qty < 1)
        return setError(`Nhập số ${KIND_LABELS[kind]} (từ 1 trở lên)`);
      list.push({ kind, qty });
    }
    if (!list.length)
      return setError('Chọn ít nhất một quyền lợi (Giờ chơi, Lượt 9 hố hoặc Lượt 18 hố)');
    const cost = Math.round(Number(price));
    if (!Number.isFinite(cost) || cost < 1) return setError('Giá bán phải lớn hơn 0');
    const validDays = Math.round(Number(days));
    if (!Number.isFinite(validDays) || validDays < 1) return setError('Hiệu lực tối thiểu 1 ngày');
    if (name.trim().length < 2) return setError('Nhập tên gói hoặc thẻ');
    setError('');
    onSave({
      ...(initial ? { id: initial.id } : {}),
      name: name.trim(),
      price: cost,
      grants: list,
      validDays,
      perks: perks.trim(),
      section: section.trim(),
      room,
      active,
    });
  }

  return (
    <form
      className="package-editor info-strip"
      onSubmit={submit}
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
          {initial ? `Chỉnh sửa chi tiết: ${initial.name}` : 'Thêm Gói giờ / Thẻ hội viên mới'}
        </h3>
        {!initial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Mẫu nhanh:</span>
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => applyTemplate(tpl)}
                style={{
                  fontSize: 11.5,
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + {tpl.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-grid" style={{ gap: 12 }}>
        <label>
          Tên gói giờ / Thẻ hội viên *
          <input
            value={name}
            maxLength={100}
            placeholder="VD: Gói Tiêu Chuẩn 25 giờ / Thẻ 3 tháng"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Giá bán niêm yết (VNĐ) *{' '}
          {Number(price) > 0 && (
            <span style={{ color: '#059669', fontWeight: 700 }}>({money(Number(price))})</span>
          )}
          <input
            inputMode="numeric"
            placeholder="VD: 7500000"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>
        <label>
          Thời hạn sử dụng (ngày) *
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
              required
              style={{ flex: 1 }}
            />
            {[30, 60, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(String(d))}
                style={{
                  padding: '6px 8px',
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: Number(days) === d ? '1px solid #059669' : '1px solid #cbd5e1',
                  background: Number(days) === d ? '#ecfdf5' : '#ffffff',
                  color: Number(days) === d ? '#047857' : '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {d}n
              </button>
            ))}
          </div>
        </label>
        <label>
          Nhóm hiển thị trên bảng giá
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={section}
              maxLength={60}
              placeholder="VD: Gói giờ chơi / Thẻ tháng / Thẻ VIP"
              onChange={(e) => setSection(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              aria-label="Chọn nhanh nhóm hiển thị"
              value=""
              onChange={(e) => {
                if (e.target.value) setSection(e.target.value);
              }}
              style={{ width: 120 }}
            >
              <option value="">Chọn mẫu...</option>
              <option value="Gói giờ chơi">Gói giờ chơi</option>
              <option value="Thẻ tháng">Thẻ tháng</option>
              <option value="Gói lượt 9/18 hố">Gói lượt 9/18 hố</option>
              <option value="Thẻ VIP">Thẻ VIP</option>
            </select>
          </div>
        </label>
        <label>
          Phạm vi Phòng / Line áp dụng
          <select value={room} onChange={(e) => setRoom(e.target.value as typeof room)}>
            <option value="any">Tất cả phòng (Line Tiêu chuẩn & VIP)</option>
            <option value="standard">Chỉ Line Tiêu chuẩn (L1 - L10)</option>
            <option value="vip">Phòng VIP (dùng được cả Line Tiêu chuẩn)</option>
          </select>
        </label>
        <label>
          Quyền lợi & Ưu đãi đi kèm (cách nhau bằng dấu “·”)
          <input
            value={perks}
            maxLength={300}
            placeholder="VD: Tặng +3 giờ · Phòng chờ VIP · Giảm 15% F&B"
            onChange={(e) => setPerks(e.target.value)}
          />
        </label>
      </div>

      <fieldset style={{ marginTop: 12, borderRadius: 8, border: '1px solid #cbd5e1', padding: 12 }}>
        <legend style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', padding: '0 6px' }}>
          Định mức Giờ chơi & Số lượt trong gói
        </legend>
        {GRANT_KINDS.map((kind) => (
          <div key={kind} className="grant-row" style={{ marginBottom: 6 }}>
            <label style={{ fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={grants[kind].on}
                onChange={(e) =>
                  setGrants({ ...grants, [kind]: { ...grants[kind], on: e.target.checked } })
                }
              />
              {KIND_LABELS[kind]}
            </label>
            {grants[kind].on && (
              <>
                <input
                  aria-label={`Số ${KIND_LABELS[kind]}`}
                  inputMode="numeric"
                  placeholder="Số lượng (VD: 25)"
                  disabled={grants[kind].unlimited}
                  value={grants[kind].qty}
                  onChange={(e) =>
                    setGrants({
                      ...grants,
                      [kind]: { ...grants[kind], qty: e.target.value.replace(/\D/g, '') },
                    })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={grants[kind].unlimited}
                    onChange={(e) =>
                      setGrants({
                        ...grants,
                        [kind]: { ...grants[kind], unlimited: e.target.checked },
                      })
                    }
                  />
                  Không giới hạn (Thẻ kỳ hạn)
                </label>
              </>
            )}
          </div>
        ))}
      </fieldset>

      <label className="check-row" style={{ marginTop: 10, fontWeight: 600 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Đang mở bán (hiển thị trên POS, Hội viên và trang /bang-gia)
      </label>

      {error && (
        <div className="error-box" role="alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      <div className="form-footer" style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
          Hủy
        </button>
        <button type="submit" className="primary" disabled={busy}>
          <Save size={15} /> {initial ? 'Lưu cập nhật gói' : 'Tạo gói mới'}
        </button>
      </div>
    </form>
  );
}

/**
 * Unified Package & Card Catalog Manager (Single Source of Truth)
 * Used inside System Settings Hub (and Members Catalog if opened directly).
 * Synchronizes directly with `/api/members` (`package_types` table in SQLite/D1).
 */
export function PackageCatalogManager({
  canAdjust = true,
  initialTypes,
  onChanged,
  onNotify,
}: {
  canAdjust?: boolean;
  initialTypes?: EditablePackage[];
  onChanged?: () => void;
  onNotify?: (msg: string) => void;
}) {
  const [types, setTypes] = useState<EditablePackage[]>(initialTypes ?? []);
  const [loading, setLoading] = useState(!initialTypes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<EditablePackage | 'new' | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'standard' | 'vip' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadCatalog() {
    try {
      setLoading(true);
      const r = await fetch('/api/members', { cache: 'no-store' });
      const v = (await r.json()) as { types?: EditablePackage[]; error?: string };
      if (!r.ok) {
        setError(v.error || 'Không tải được danh mục gói giờ & thẻ');
      } else {
        setTypes(v.types ?? []);
        setError('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialTypes) {
      setTypes(initialTypes);
    } else {
      loadCatalog();
    }
  }, [initialTypes]);

  async function postMemberApi(body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await r.json()) as { error?: string; replayed?: boolean };
      if (!r.ok) throw new Error(result.error || 'Không thực hiện được thao tác');
      const msg = result.replayed ? 'Đã ghi nhận trước đó; không ghi trùng.' : successMsg;
      setNotice(msg);
      onNotify?.(msg);
      await loadCatalog();
      onChanged?.();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      if (roomFilter === 'standard' && t.room === 'vip') return false;
      if (roomFilter === 'vip' && t.room !== 'vip') return false;
      if (roomFilter === 'active' && !t.active) return false;
      if (roomFilter === 'inactive' && t.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('vi');
        const hay = `${t.name} ${t.section ?? ''} ${t.perks ?? ''} ${formatGrantsSummary(t.grants)}`.toLocaleLowerCase('vi');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [types, roomFilter, searchQuery]);

  const activeCount = useMemo(() => types.filter((t) => !!t.active).length, [types]);
  const inactiveCount = types.length - activeCount;

  return (
    <div className="members-catalog-view">
      {error && (
        <div className="members-alert error-box" role="alert" style={{ marginBottom: 12 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="close-btn" onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="members-alert notice-box" role="status" style={{ marginBottom: 12 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button type="button" className="close-btn" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sync Info & KPI Strip */}
      <div
        className="catalog-info-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <p className="form-note" style={{ margin: 0, fontSize: 13, color: '#065f46' }}>
            <strong>Trung tâm Cài đặt Gói giờ & Thẻ duy nhất:</strong> Mọi thay đổi (Thêm / Sửa / Xóa) tại
            đây được đồng bộ tức thì sang màn hình <strong>Hội viên</strong>, <strong>POS Bán hàng</strong>,{' '}
            <strong>Cổng Hội viên (/tai-khoan)</strong> và{' '}
            <a
              href="/bang-gia"
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 700, textDecoration: 'underline' }}
            >
              Bảng giá công khai (/bang-gia) <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>
            .
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: '#065f46',
            }}
          >
            Tổng: {types.length} gói
          </span>
          <span
            style={{
              background: '#dcfce7',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: '#15803d',
            }}
          >
            Đang bán: {activeCount}
          </span>
          {inactiveCount > 0 && (
            <span
              style={{
                background: '#f1f5f9',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Ngừng bán: {inactiveCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter & Actions Toolbar */}
      <div
        className="mod-toolbar"
        style={{
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div className="mod-chip-group" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tất cả gói', count: types.length },
            {
              key: 'standard',
              label: 'Line Tiêu chuẩn',
              count: types.filter((t) => t.room !== 'vip').length,
            },
            {
              key: 'vip',
              label: 'Phòng VIP',
              count: types.filter((t) => t.room === 'vip').length,
            },
            {
              key: 'active',
              label: 'Đang mở bán',
              count: activeCount,
            },
            {
              key: 'inactive',
              label: 'Ngừng bán',
              count: inactiveCount,
            },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`mod-filter-chip ${roomFilter === opt.key ? 'active' : ''}`}
              onClick={() => setRoomFilter(opt.key as typeof roomFilter)}
            >
              <span>{opt.label}</span>
              <span className="mod-chip-count">{opt.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, color: '#94a3b8', pointerEvents: 'none' }}
            />
            <input
              type="search"
              placeholder="Tìm tên gói, quyền lợi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 12px 7px 30px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                minWidth: 190,
              }}
            />
          </div>

          {canAdjust && (
            <>
              <button
                type="button"
                className="ar-btn-secondary"
                disabled={busy}
                onClick={() =>
                  postMemberApi(
                    { action: 'types-seed' },
                    'Đã bổ sung danh mục gói mẫu theo bảng giá chính thức',
                  )
                }
                title="Bổ sung các gói mẫu chuẩn nếu chưa có"
              >
                <RotateCcw size={14} /> Khôi phục gói mẫu
              </button>
              {!editing && (
                <button
                  type="button"
                  className="ar-btn-primary"
                  disabled={busy}
                  onClick={() => setEditing('new')}
                >
                  <Plus size={15} /> Thêm gói / thẻ mới
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Form */}
      {canAdjust && editing && (
        <div className="catalog-editor-wrapper animate-fade-in">
          <PackageEditor
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              const ok = await postMemberApi(
                { action: 'type-save', requestId: operationKey(), ...body },
                body.id ? `Đã cập nhật gói "${body.name}"` : `Đã thêm gói mới "${body.name}"`,
              );
              if (ok) setEditing(null);
            }}
          />
        </div>
      )}

      {/* Package Table */}
      <div className="catalog-table-wrap">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            Đang tải danh mục Gói giờ & Thẻ...
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Tên Gói giờ / Thẻ',
                cell: (t: EditablePackage) => (
                  <div className="pkg-type-name-cell">
                    <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{t.name}</strong>
                    {t.section && (
                      <span
                        className="section-tag"
                        style={{
                          display: 'inline-block',
                          marginLeft: 6,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        {t.section}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'price',
                header: 'Đơn giá',
                cell: (t) => (
                  <strong className="text-emerald" style={{ fontSize: 13.5 }}>
                    {money(t.price)}
                  </strong>
                ),
              },
              {
                key: 'grants',
                header: 'Định mức & Quyền lợi chi tiết',
                cell: (t) => (
                  <div className="grants-cell">
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {formatGrantsSummary(t.grants)}
                    </span>
                    {t.perks && (
                      <small className="text-muted block" style={{ display: 'block', marginTop: 2 }}>
                        · {t.perks}
                      </small>
                    )}
                  </div>
                ),
              },
              {
                key: 'room',
                header: 'Phòng áp dụng',
                cell: (t) => (
                  <span className="room-badge">
                    {t.room === 'standard'
                      ? 'Line Tiêu chuẩn'
                      : t.room === 'vip'
                        ? 'Phòng VIP'
                        : 'Tất cả phòng'}
                  </span>
                ),
              },
              {
                key: 'days',
                header: 'Thời hạn',
                cell: (t) => <span style={{ fontWeight: 600 }}>{t.valid_days} ngày</span>,
              },
              {
                key: 'status',
                header: 'Trạng thái',
                cell: (t) => (
                  <span className={`status-pill ${t.active ? 'active' : 'inactive'}`}>
                    {t.active ? 'Đang bán' : 'Ngừng bán'}
                  </span>
                ),
              },
              ...(canAdjust
                ? [
                    {
                      key: 'actions',
                      header: 'Thao tác (Sửa / Ẩn / Xóa)',
                      cell: (t: EditablePackage) => (
                        <div className="table-actions" style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="secondary btn-xs"
                            disabled={busy}
                            onClick={() => setEditing(t)}
                            title="Chỉnh sửa chi tiết gói"
                          >
                            <Edit3 size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            className="secondary btn-xs"
                            disabled={busy}
                            onClick={() =>
                              postMemberApi(
                                {
                                  action: 'type-save',
                                  id: t.id,
                                  requestId: operationKey(),
                                  name: t.name,
                                  price: t.price,
                                  grants: JSON.parse(t.grants),
                                  validDays: t.valid_days,
                                  perks: t.perks,
                                  section: t.section ?? '',
                                  room: t.room ?? 'any',
                                  active: !t.active,
                                },
                                t.active
                                  ? `Đã tạm ngừng bán gói "${t.name}"`
                                  : `Đã mở bán lại gói "${t.name}"`,
                              )
                            }
                            title={t.active ? 'Tạm ngừng bán trên bảng giá' : 'Mở bán lại'}
                          >
                            <Power size={13} /> {t.active ? 'Ngừng bán' : 'Mở bán'}
                          </button>
                          <button
                            type="button"
                            className="secondary btn-xs"
                            disabled={busy}
                            style={{ color: '#dc2626', borderColor: '#fecaca' }}
                            onClick={async () => {
                              const confirmed = await askConfirm(
                                `Xác nhận xóa vĩnh viễn gói "${t.name}" khỏi danh mục hệ thống? (Các thẻ khách đã mua trước đó vẫn giữ nguyên hiệu lực)`,
                              );
                              if (!confirmed) return;
                              if (editing && editing !== 'new' && editing.id === t.id) {
                                setEditing(null);
                              }
                              await postMemberApi(
                                { action: 'type-delete', id: t.id },
                                `Đã xóa gói "${t.name}" khỏi hệ thống`,
                              );
                            }}
                            title="Xóa gói khỏi danh mục"
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={filteredTypes}
            rowKey={(t) => t.id}
            empty="Chưa có gói giờ hoặc thẻ hội viên nào phù hợp. Nhấn '+ Thêm gói / thẻ mới' hoặc 'Khôi phục gói mẫu'."
          />
        )}
      </div>
    </div>
  );
}
