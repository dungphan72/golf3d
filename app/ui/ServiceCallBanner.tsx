'use client';

import { useState, useEffect } from 'react';
import { Bell, UserCheck, CreditCard, ChevronRight, X, Clock } from 'lucide-react';
import { type ServiceCall, formatCallTimer } from '../../lib/service-call';

type Props = {
  call: ServiceCall | null;
  onAcknowledge: (id: string) => Promise<boolean>;
  onOpenDetails: () => void;
  onDismiss: (id: string) => void;
  onNavigateToPayment?: (roomId: string, bookingId?: string | null) => void;
};

export function ServiceCallBanner({
  call,
  onAcknowledge,
  onOpenDetails,
  onDismiss,
  onNavigateToPayment,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!call) return;
    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - call.created_at) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [call]);

  if (!call) return null;

  const isBilling = call.category_code === 'BILLING';

  return (
    <div style={styles.bannerWrap} role="alert" aria-live="assertive">
      <div style={styles.leftCol}>
        <div style={styles.bellIconWrap}>
          <Bell size={20} color="#dc2626" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={styles.roomTag}>{call.room_name || call.room_id}</span>
            <strong style={styles.alertTitle}>ĐANG GỌI PHỤC VỤ</strong>
            <span style={styles.timerBadge}>
              <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {formatCallTimer(elapsedSeconds * 1000)}
            </span>
          </div>
          <div style={styles.metaRow}>
            <span>
              Yêu cầu: <strong>{call.category_name || call.category_code}</strong>
            </span>
            <span>·</span>
            <span>{call.customer_name || 'Khách tại line'}</span>
            {call.note && <em>(Ghi chú: {call.note})</em>}
          </div>
        </div>
      </div>

      <div style={styles.actionsCol}>
        <button
          type="button"
          style={styles.ackBtn}
          onClick={() => onAcknowledge(call.id)}
        >
          <UserCheck size={16} />
          <span>Tiếp nhận</span>
        </button>

        {isBilling && onNavigateToPayment && (
          <button
            type="button"
            style={styles.payBtn}
            onClick={() => onNavigateToPayment(call.room_id, call.booking_id)}
          >
            <CreditCard size={15} />
            <span>Thu tiền</span>
          </button>
        )}

        <button
          type="button"
          style={styles.detailBtn}
          onClick={onOpenDetails}
        >
          <span>Chi tiết</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          style={styles.closeBtn}
          onClick={() => onDismiss(call.id)}
          aria-label="Đóng cảnh báo"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bannerWrap: {
    background: '#fef2f2',
    border: '1.5px solid #f87171',
    borderRadius: 5,
    padding: '10px 14px',
    margin: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)',
    animation: 'pos-m3-pulse 2s infinite',
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    flexWrap: 'wrap',
  },
  leftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  bellIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 5,
    background: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roomTag: {
    background: '#dc2626',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: '0.3px',
  },
  alertTitle: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: 800,
    letterSpacing: '0.4px',
  },
  timerBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#b91c1c',
    background: '#fecaca',
    padding: '2px 6px',
    borderRadius: 4,
  },
  metaRow: {
    fontSize: 13,
    color: '#450a0a',
    marginTop: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionsCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  ackBtn: {
    background: '#047857',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 5,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
  },
  payBtn: {
    background: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 5,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  detailBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '8px 12px',
    borderRadius: 5,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: 6,
    cursor: 'pointer',
    borderRadius: 4,
  },
};
