'use client';

import { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  X,
  UserCheck,
  Play,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Plus,
  Coffee,
  LifeBuoy,
  Crown,
  HelpCircle,
} from 'lucide-react';
import {
  type ServiceCall,
  type ResolutionType,
  RESOLUTION_LABELS,
  formatCallTimer,
} from '../../lib/service-call';
import { rooms } from '../../lib/club';

const ICON_MAP: Record<string, typeof Bell> = {
  UserCheck,
  Coffee,
  LifeBuoy,
  Crown,
  CreditCard,
  HelpCircle,
  Bell,
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  calls: ServiceCall[];
  onAcknowledge: (id: string) => Promise<boolean>;
  onStart: (id: string) => Promise<boolean>;
  onComplete: (id: string, resType: ResolutionType, note?: string) => Promise<boolean>;
  onCancel: (id: string, reason?: string) => Promise<boolean>;
  onCreateProxy: (roomId: string, categoryCode: string, note?: string) => Promise<boolean>;
  onNavigateToPayment?: (roomId: string, bookingId?: string | null) => void;
};

export function ServiceCallDrawer({
  isOpen,
  onClose,
  calls,
  onAcknowledge,
  onStart,
  onComplete,
  onCancel,
  onCreateProxy,
  onNavigateToPayment,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'history'>('all');
  const [completingCall, setCompletingCall] = useState<ServiceCall | null>(null);
  const [resolutionType, setResolutionType] = useState<ResolutionType>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [proxyRoomId, setProxyRoomId] = useState(rooms[0].id);
  const [proxyCatCode, setProxyCatCode] = useState('STAFF');
  const [proxyNote, setProxyNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const filteredCalls = calls.filter((c) => {
    if (filter === 'pending') return c.status === 'CREATED';
    if (filter === 'in_progress') return ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status);
    if (filter === 'history') return ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(c.status);
    return true;
  });

  const pendingCount = calls.filter((c) => c.status === 'CREATED').length;
  const inProgressCount = calls.filter((c) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)).length;

  async function handleConfirmComplete() {
    if (!completingCall || busy) return;
    setBusy(true);
    try {
      const ok = await onComplete(completingCall.id, resolutionType, resolutionNote.trim() || undefined);
      if (ok) {
        setCompletingCall(null);
        setResolutionNote('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmProxyCreate() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onCreateProxy(proxyRoomId, proxyCatCode, proxyNote.trim() || undefined);
      if (ok) {
        setShowCreateModal(false);
        setProxyNote('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.headIcon}>
              <Bell size={20} color="#047857" />
            </div>
            <div>
              <h3 style={styles.title}>Quản lý gọi phục vụ tại Line</h3>
              <small style={styles.subtitle}>
                {pendingCount > 0 ? (
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{pendingCount} yêu cầu đang chờ tiếp nhận</span>
                ) : (
                  'Tất cả line đang ổn định'
                )}
              </small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              style={styles.addBtn}
              onClick={() => setShowCreateModal(true)}
              title="Tạo yêu cầu hộ khách"
            >
              <Plus size={15} />
              <span>Tạo yêu cầu</span>
            </button>
            <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={styles.tabsRow}>
          <button
            type="button"
            style={{ ...styles.tabBtn, ...(filter === 'all' ? styles.tabBtnActive : {}) }}
            onClick={() => setFilter('all')}
          >
            Tất cả ({calls.length})
          </button>
          <button
            type="button"
            style={{ ...styles.tabBtn, ...(filter === 'pending' ? styles.tabBtnActive : {}) }}
            onClick={() => setFilter('pending')}
          >
            Chờ tiếp nhận {pendingCount > 0 && <span style={styles.badgeCount}>{pendingCount}</span>}
          </button>
          <button
            type="button"
            style={{ ...styles.tabBtn, ...(filter === 'in_progress' ? styles.tabBtnActive : {}) }}
            onClick={() => setFilter('in_progress')}
          >
            Đang xử lý ({inProgressCount})
          </button>
          <button
            type="button"
            style={{ ...styles.tabBtn, ...(filter === 'history' ? styles.tabBtnActive : {}) }}
            onClick={() => setFilter('history')}
          >
            Lịch sử
          </button>
        </div>

        {/* Content List */}
        <div style={styles.listWrap}>
          {filteredCalls.length === 0 ? (
            <div style={styles.emptyWrap}>
              <Bell size={42} color="#cbd5e1" />
              <p style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Không có yêu cầu nào trong danh mục này.</p>
            </div>
          ) : (
            filteredCalls.map((c) => {
              const isCreated = c.status === 'CREATED';
              const isAck = c.status === 'ACKNOWLEDGED';
              const isInProgress = c.status === 'IN_PROGRESS';
              const isBilling = c.category_code === 'BILLING';
              const elapsedMs = Date.now() - c.created_at;
              const IconComp = ICON_MAP[c.category_code] || Bell;

              return (
                <div
                  key={c.id}
                  style={{
                    ...styles.callItem,
                    ...(isCreated ? styles.callItemPending : {}),
                    ...(c.sla_ack_breached ? styles.callItemSlaBreached : {}),
                  }}
                >
                  <div style={styles.itemTopRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          ...styles.roomBadge,
                          ...(c.room_id.startsWith('vip') ? styles.roomBadgeVip : {}),
                        }}
                      >
                        {c.room_name || c.room_id}
                      </span>
                      <strong style={styles.catLabel}>
                        <IconComp size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                        {c.category_name || c.category_code}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...(isCreated ? styles.statusPillCreated : {}),
                          ...(isAck || isInProgress ? styles.statusPillProgress : {}),
                          ...(c.status === 'COMPLETED' ? styles.statusPillCompleted : {}),
                        }}
                      >
                        {isCreated && 'Chờ nhận'}
                        {isAck && 'Đã nhận'}
                        {isInProgress && 'Đang hỗ trợ'}
                        {c.status === 'COMPLETED' && 'Đã xong'}
                        {c.status === 'CANCELLED' && 'Đã hủy'}
                      </span>
                      <span style={styles.timeBadge}>{formatCallTimer(elapsedMs)}</span>
                    </div>
                  </div>

                  <div style={styles.itemMetaRow}>
                    <span>
                      Khách: <strong>{c.customer_name || 'Khách tại line'}</strong>
                      {c.customer_phone ? ` (${c.customer_phone})` : ''}
                    </span>
                    {c.assigned_staff_name && (
                      <span style={{ color: '#047857', fontWeight: 600 }}>
                        <UserCheck size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        {c.assigned_staff_name}
                      </span>
                    )}
                  </div>

                  {c.note && (
                    <div style={styles.itemNote}>
                      <em>Ghi chú: {c.note}</em>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div style={styles.itemActions}>
                    {isCreated && (
                      <button
                        type="button"
                        style={styles.btnPrimary}
                        onClick={() => onAcknowledge(c.id)}
                      >
                        <UserCheck size={15} />
                        <span>Tiếp nhận</span>
                      </button>
                    )}

                    {isAck && (
                      <button
                        type="button"
                        style={styles.btnBlue}
                        onClick={() => onStart(c.id)}
                      >
                        <Play size={15} />
                        <span>Bắt đầu xử lý</span>
                      </button>
                    )}

                    {(isAck || isInProgress) && (
                      <button
                        type="button"
                        style={styles.btnGreen}
                        onClick={() => setCompletingCall(c)}
                      >
                        <CheckCircle2 size={15} />
                        <span>Hoàn thành</span>
                      </button>
                    )}

                    {isBilling && onNavigateToPayment && (
                      <button
                        type="button"
                        style={styles.btnGold}
                        onClick={() => {
                          onNavigateToPayment(c.room_id, c.booking_id);
                          onClose();
                        }}
                      >
                        <CreditCard size={15} />
                        <span>Mở thanh toán</span>
                      </button>
                    )}

                    {['CREATED', 'ACKNOWLEDGED'].includes(c.status) && (
                      <button
                        type="button"
                        style={styles.btnDanger}
                        onClick={() => {
                          if (confirm('Hủy yêu cầu gọi này?')) {
                            onCancel(c.id, 'Nhân viên hủy tại quầy');
                          }
                        }}
                      >
                        <X size={14} />
                        <span>Hủy</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Complete Resolution Modal */}
      {completingCall && (
        <div style={styles.subModalOverlay}>
          <div style={styles.subModalContent}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: '#0f172a' }}>
                Xác nhận hoàn tất ({completingCall.room_name})
              </strong>
              <button
                type="button"
                onClick={() => setCompletingCall(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <label style={styles.fieldLabel}>Kết quả phục vụ:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {(['RESOLVED', 'NO_SHOW', 'CUSTOMER_CANCELLED', 'TRANSFERRED'] as ResolutionType[]).map((type) => (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13.5,
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 5,
                    cursor: 'pointer',
                    background: resolutionType === type ? '#f0fdf4' : '#ffffff',
                    borderColor: resolutionType === type ? '#047857' : '#e2e8f0',
                  }}
                >
                  <input
                    type="radio"
                    name="resType"
                    checked={resolutionType === type}
                    onChange={() => setResolutionType(type)}
                  />
                  <span>{RESOLUTION_LABELS[type].vi}</span>
                </label>
              ))}
            </div>

            <label style={styles.fieldLabel}>Ghi chú xử lý (tùy chọn):</label>
            <input
              type="text"
              placeholder="VD: Đã hướng dẫn khách chỉnh máy xong..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              style={styles.textInput}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => setCompletingCall(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                style={styles.btnGreen}
                onClick={handleConfirmComplete}
                disabled={busy}
              >
                Lưu hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proxy Create Modal (Staff creates call on behalf of guest) */}
      {showCreateModal && (
        <div style={styles.subModalOverlay}>
          <div style={styles.subModalContent}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: '#0f172a' }}>Tạo yêu cầu gọi phục vụ hộ khách</strong>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <label style={styles.fieldLabel}>Chọn Line / Phòng:</label>
            <select
              value={proxyRoomId}
              onChange={(e) => setProxyRoomId(e.target.value)}
              style={styles.selectInput}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.vip ? `Phòng ${r.name}` : r.name}
                </option>
              ))}
            </select>

            <label style={{ ...styles.fieldLabel, marginTop: 10 }}>Loại yêu cầu:</label>
            <select
              value={proxyCatCode}
              onChange={(e) => setProxyCatCode(e.target.value)}
              style={styles.selectInput}
            >
              <option value="STAFF">Gọi nhân viên</option>
              <option value="FNB">Đồ ăn / Nước uống</option>
              <option value="EQUIPMENT">Hỗ trợ thiết bị Golf</option>
              <option value="COACH">Hỗ trợ Huấn luyện viên</option>
              <option value="BILLING">Yêu cầu thanh toán</option>
              <option value="OTHER">Yêu cầu khác</option>
            </select>

            <label style={{ ...styles.fieldLabel, marginTop: 10 }}>Ghi chú:</label>
            <input
              type="text"
              placeholder="VD: Khách nhờ đổi bóng golf..."
              value={proxyNote}
              onChange={(e) => setProxyNote(e.target.value)}
              style={styles.textInput}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => setShowCreateModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                style={styles.btnPrimary}
                onClick={handleConfirmProxyCreate}
                disabled={busy}
              >
                Tạo yêu cầu ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.4)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'flex-end',
    backdropFilter: 'blur(2px)',
  },
  drawer: {
    width: '100%',
    maxWidth: 480,
    background: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
  },
  head: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f8fafc',
  },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 5,
    background: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748b',
    display: 'block',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: 6,
    borderRadius: 4,
  },
  addBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#047857',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '5px 10px',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
    padding: '0 12px',
    gap: 4,
    overflowX: 'auto',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 10px',
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  tabBtnActive: {
    color: '#047857',
    borderBottomColor: '#047857',
  },
  badgeCount: {
    background: '#dc2626',
    color: '#ffffff',
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 10,
    fontWeight: 700,
  },
  listWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: '#f8fafc',
  },
  emptyWrap: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  callItem: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 5,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  callItemPending: {
    borderColor: '#fca5a5',
    background: '#fffbfb',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
  },
  callItemSlaBreached: {
    borderColor: '#f97316',
    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.12)',
  },
  itemTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomBadge: {
    background: '#047857',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 4,
  },
  roomBadgeVip: {
    background: '#b45309',
  },
  catLabel: {
    fontSize: 13.5,
    color: '#1e293b',
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 4,
    background: '#f1f5f9',
    color: '#475569',
  },
  statusPillCreated: {
    background: '#fee2e2',
    color: '#dc2626',
  },
  statusPillProgress: {
    background: '#e0f2fe',
    color: '#0284c7',
  },
  statusPillCompleted: {
    background: '#dcfce7',
    color: '#16a34a',
  },
  timeBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
  },
  itemMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12.5,
    color: '#475569',
  },
  itemNote: {
    fontSize: 12,
    color: '#64748b',
    background: '#f8fafc',
    padding: '5px 8px',
    borderRadius: 4,
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: '#047857',
    color: '#ffffff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  btnBlue: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  btnGreen: {
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  btnGold: {
    background: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  btnDanger: {
    background: '#ffffff',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  btnSecondary: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  subModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  subModalContent: {
    background: '#ffffff',
    borderRadius: 5,
    padding: 18,
    maxWidth: 380,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 5,
  },
  selectInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    fontSize: 13.5,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    fontSize: 13.5,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
};
