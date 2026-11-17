'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  X,
  UserCheck,
  Coffee,
  LifeBuoy,
  Crown,
  CreditCard,
  HelpCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  type ServiceCall,
  type ServiceCallCategory,
  DEFAULT_CATEGORIES,
  formatCallTimer,
} from '../../lib/service-call';

const ICON_MAP: Record<string, typeof Bell> = {
  UserCheck,
  Coffee,
  LifeBuoy,
  Crown,
  CreditCard,
  HelpCircle,
  Bell,
};

type CategoryItem = {
  code: string;
  name_vi: string;
  name_en?: string;
  name_ko?: string;
  icon: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeBooking: {
    id: string;
    roomId?: string;
    room: string;
    service?: string;
  } | null;
  onCallCreated?: () => void;
};

export function MemberServiceCallModal({ isOpen, onClose, activeBooking, onCallCreated }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCat, setSelectedCat] = useState('STAFF');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeCall, setActiveCall] = useState<ServiceCall | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/member/call', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.ok) {
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
          } else {
            setCategories(DEFAULT_CATEGORIES);
          }
          if (data.activeCall) {
            setActiveCall(data.activeCall);
          } else {
            setActiveCall(null);
          }
        }
      }
    } catch {
      // Keep state
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      const interval = setInterval(loadStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadStatus]);

  useEffect(() => {
    if (!activeCall) return;
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - activeCall.created_at) / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeCall]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/member/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode: selectedCat,
          note: note.trim() || undefined,
          roomId: activeBooking?.roomId,
        }),
      });
      const data = (await res.json()) as any;
      if (data.ok && data.call) {
        setActiveCall(data.call);
        onCallCreated?.();
      } else {
        setErrorMsg(data.error || 'Chưa gửi được yêu cầu gọi phục vụ');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1512',
          border: '1px solid #1e3a2f',
          borderRadius: 8,
          width: '100%',
          maxWidth: 460,
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e3a2f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #13271f 0%, #0d1512 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fcd34d' }}>
                Gọi phục vụ trực tiếp
              </h3>
              <small style={{ color: '#9ca3af', fontSize: 12 }}>
                {activeBooking ? `Vị trí: ${activeBooking.room}` : 'SIGOLF Club'}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 5,
                background: '#451a1a',
                border: '1px solid #7f1d1d',
                color: '#fca5a5',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeCall ? (
            /* Active Call In Progress State */
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: activeCall.status === 'CREATED' ? '#451a1a' : '#064e3b',
                  border: activeCall.status === 'CREATED' ? '2px solid #ef4444' : '2px solid #10b981',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: activeCall.status === 'CREATED' ? 'pulse 2s infinite' : 'none',
                }}
              >
                {activeCall.status === 'CREATED' ? (
                  <Bell size={26} color="#f87171" />
                ) : (
                  <UserCheck size={26} color="#34d399" />
                )}
              </div>

              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 8,
                  background: activeCall.status === 'CREATED' ? '#7f1d1d' : '#047857',
                  color: '#fff',
                }}
              >
                {activeCall.status === 'CREATED' && 'ĐANG CHỜ TIẾP NHẬN'}
                {activeCall.status === 'ACKNOWLEDGED' && 'ĐÃ TIẾP NHẬN'}
                {activeCall.status === 'IN_PROGRESS' && 'ĐANG PHỤC VỤ'}
              </span>

              <h4 style={{ margin: '4px 0 8px', fontSize: 17, color: '#f3f4f6' }}>
                {activeCall.category_code === 'STAFF' && 'Yêu cầu nhân viên hỗ trợ'}
                {activeCall.category_code === 'FNB' && 'Yêu cầu đồ ăn / nước uống'}
                {activeCall.category_code === 'GEAR_SUPPORT' && 'Hỗ trợ thiết bị & phòng 3D'}
                {activeCall.category_code === 'COACH_SUPPORT' && 'Hỗ trợ huấn luyện viên'}
                {activeCall.category_code === 'BILLING' && 'Yêu cầu thanh toán'}
                {activeCall.category_code === 'OTHER' && 'Hỗ trợ dịch vụ khác'}
              </h4>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#fbbf24',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                <Clock size={15} />
                <span>Thời gian chờ: {formatCallTimer(elapsed * 1000)}</span>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                {activeCall.status === 'CREATED' &&
                  'Thông báo đã gửi đến POS thu ngân và nhân viên. Nhân viên sẽ có mặt tại Line của bạn trong giây lát.'}
                {activeCall.status === 'ACKNOWLEDGED' &&
                  (activeCall.assigned_staff_name
                    ? `Nhân viên ${activeCall.assigned_staff_name} đã nhận yêu cầu và đang di chuyển đến hỗ trợ.`
                    : 'Nhân viên đã tiếp nhận và đang xử lý yêu cầu.')}
                {activeCall.status === 'IN_PROGRESS' && 'Nhân viên đang trực tiếp hỗ trợ tại Line của bạn.'}
              </p>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 5,
                  background: '#1e3a2f',
                  border: '1px solid #2d5a49',
                  color: '#f3f4f6',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Đóng cửa sổ (Yêu cầu vẫn được xử lý)
              </button>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#d1d5db',
                  marginBottom: 10,
                }}
              >
                Chọn loại hỗ trợ bạn cần:
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {(categories.length > 0 ? categories : DEFAULT_CATEGORIES).map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Bell;
                  const isSelected = selectedCat === cat.code;
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setSelectedCat(cat.code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid #10b981' : '1px solid #1e3a2f',
                        background: isSelected ? '#064e3b' : '#111d17',
                        color: isSelected ? '#ffffff' : '#9ca3af',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 12.5,
                        fontWeight: isSelected ? 600 : 500,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} color={isSelected ? '#34d399' : '#6b7280'} />
                      <span style={{ lineHeight: 1.2 }}>{cat.name_vi}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#d1d5db',
                    marginBottom: 6,
                  }}
                >
                  Ghi chú thêm (tùy chọn):
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Cần thêm 1 ly trà đá, bóng bị kẹt, chỉnh góc phát bóng..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: '1px solid #1e3a2f',
                    background: '#111d17',
                    color: '#ffffff',
                    fontSize: 13,
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 5,
                    border: '1px solid #374151',
                    background: '#1f2937',
                    color: '#e5e7eb',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: 5,
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Bell size={16} />
                      <span>Gửi yêu cầu phục vụ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
