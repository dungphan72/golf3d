'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Coffee,
  CreditCard,
  LifeBuoy,
  Crown,
  HelpCircle,
  UserCheck,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
  Send,
  Loader2,
  Globe,
  Phone,
  RotateCcw,
} from 'lucide-react';
import {
  type ServiceCallCategory,
  type SupportedLang,
  STATUS_LABELS,
  formatCallTimer,
} from '../../../lib/service-call';

const ICON_MAP: Record<string, typeof Bell> = {
  UserCheck,
  Coffee,
  LifeBuoy,
  Crown,
  CreditCard,
  HelpCircle,
  Bell,
};

type QrInfo = {
  tenant: string;
  roomId: string;
  roomName: string;
  isVip: boolean;
  guestMode: 'MODE_A' | 'MODE_B' | 'MODE_C';
  requireActiveSession: boolean;
  hasActiveSession: boolean;
  activeBooking?: { customer: string; id: string } | null;
  categories: ServiceCallCategory[];
};

type ActiveCallState = {
  id: string;
  categoryCode: string;
  categoryName: string;
  status: 'CREATED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedStaffName?: string | null;
  createdAt: number;
};

export function CallClient({ token }: { token: string }) {
  const [lang, setLang] = useState<SupportedLang>('vi');
  const [info, setInfo] = useState<QrInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guest inputs
  const [sessionToken, setSessionToken] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [selectedCat, setSelectedCat] = useState<ServiceCallCategory | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Active Call tracking
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Resolve QR Token on Mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/public/call/resolve?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as any;
        if (!mounted) return;
        if (res.ok && data.ok) {
          setInfo(data);
          if (data.categories?.length > 0) {
            setSelectedCat(data.categories[0]);
          }
          // Check cached session
          const cachedSess = sessionStorage.getItem(`sc_sess_${data.roomId}`);
          if (cachedSess) setSessionToken(cachedSess);
        } else {
          setError(data.error || 'Mã QR không hợp lệ hoặc đã bị thu hồi');
        }
      })
      .catch(() => {
        if (mounted) setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  // 2. Poll Active Call Status
  useEffect(() => {
    if (!activeCall || ['COMPLETED', 'CANCELLED'].includes(activeCall.status)) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    async function checkStatus() {
      if (!activeCall || !info) return;
      try {
        const res = await fetch(
          `/api/public/call/request?callId=${encodeURIComponent(activeCall.id)}&tenant=${encodeURIComponent(info.tenant)}&sessionToken=${encodeURIComponent(sessionToken)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.ok && json.call) {
            const c = json.call;
            setActiveCall((prev) =>
              prev
                ? {
                    ...prev,
                    status: c.status,
                    assignedStaffName: c.assignedStaffName,
                  }
                : null
            );
          }
        }
      } catch {
        // Keep last known status on network hitch
      }
    }

    pollTimerRef.current = setInterval(checkStatus, 3000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeCall, info, sessionToken]);

  // 3. Clock Tick for active call duration
  useEffect(() => {
    if (!activeCall) return;
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - activeCall.createdAt) / 1000));
    };
    updateElapsed();
    timerTickRef.current = setInterval(updateElapsed, 1000);
    return () => {
      if (timerTickRef.current) clearInterval(timerTickRef.current);
    };
  }, [activeCall]);

  // Handle Session Creation if needed
  async function ensureSession(phone?: string): Promise<string | null> {
    if (sessionToken) return sessionToken;
    try {
      const res = await fetch('/api/public/call/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone }),
      });
      const data = (await res.json()) as any;
      if (res.ok && data.ok && data.sessionToken) {
        setSessionToken(data.sessionToken);
        if (info?.roomId) {
          sessionStorage.setItem(`sc_sess_${info.roomId}`, data.sessionToken);
        }
        return data.sessionToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Handle Call Submit
  async function handleSubmitCall() {
    if (!selectedCat || submitting) return;
    setError('');

    // If Mode B and no phone entered, open phone input modal
    if (info?.guestMode === 'MODE_B' && !phoneInput.trim()) {
      setShowPhoneModal(true);
      return;
    }

    setSubmitting(true);
    try {
      const sess = await ensureSession(phoneInput.trim());
      const res = await fetch('/api/public/call/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          sessionToken: sess,
          categoryCode: selectedCat.code,
          customerName: nameInput.trim() || undefined,
          customerPhone: phoneInput.trim() || undefined,
          note: noteInput.trim() || undefined,
          idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Chưa gửi được yêu cầu. Vui lòng thử lại.');
      }

      setActiveCall({
        id: data.callId,
        categoryCode: selectedCat.code,
        categoryName: selectedCat[`name_${lang}`] || selectedCat.name_vi,
        status: 'CREATED',
        createdAt: data.createdAt || Date.now(),
      });
      setShowPhoneModal(false);
      setNoteInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gửi được yêu cầu');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Guest Cancel
  async function handleCancelCall() {
    if (!activeCall || submitting) return;
    if (confirm(lang === 'en' ? 'Are you sure you want to cancel?' : lang === 'ko' ? '요청을 취소하시겠습니까?' : 'Bạn có chắc chắn muốn hủy yêu cầu này?')) {
      setSubmitting(true);
      try {
        const res = await fetch('/api/public/call/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCall.id,
            sessionToken,
            reason: 'Khách tự hủy trên màn hình',
          }),
        });
        const data = (await res.json()) as any;
        if (res.ok && data.ok) {
          setActiveCall((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
        } else {
          alert(data.error || 'Không thể hủy yêu cầu');
        }
      } catch {
        alert('Lỗi kết nối khi hủy');
      } finally {
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 size={36} className="pos-m3-spin" color="#047857" />
        <p style={{ marginTop: 14, color: '#475569', fontSize: 15, fontFamily: 'inherit' }}>
          Đang kết nối tới line chơi...
        </p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorCard}>
          <AlertTriangle size={36} color="#dc2626" />
          <h3 style={{ margin: '12px 0 6px', color: '#991b1b', fontSize: 17 }}>Không thể mở yêu cầu</h3>
          <p style={{ color: '#7f1d1d', fontSize: 14, lineHeight: 1.5 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logoBadge}>SG</div>
          <div>
            <h2 style={styles.clubName}>Saigon Indoor Golf</h2>
            <div style={styles.roomTag}>
              {info?.isVip ? <Crown size={13} color="#b45309" /> : <Clock size={13} color="#047857" />}
              <span>{info?.roomName}</span>
            </div>
          </div>
        </div>

        {/* Language Pill Selector */}
        <div style={styles.langSelector}>
          <Globe size={14} color="#64748b" />
          <button
            type="button"
            style={{ ...styles.langBtn, ...(lang === 'vi' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('vi')}
          >
            VI
          </button>
          <button
            type="button"
            style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            style={{ ...styles.langBtn, ...(lang === 'ko' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('ko')}
          >
            KO
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={styles.main}>
        {error && (
          <div style={styles.alertBanner}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Active Call Tracker Card */}
        {activeCall && (
          <section style={styles.activeCallCard}>
            <div style={styles.activeCallHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.pulseDot} />
                <strong style={{ fontSize: 16, color: '#064e3b' }}>
                  {activeCall.status === 'CREATED' && (lang === 'en' ? 'Request Sent' : lang === 'ko' ? '요청 완료' : 'Đã gửi yêu cầu')}
                  {activeCall.status === 'ACKNOWLEDGED' && (lang === 'en' ? 'Staff On The Way' : lang === 'ko' ? '접수 완료' : 'Nhân viên đang đến')}
                  {activeCall.status === 'IN_PROGRESS' && (lang === 'en' ? 'Assisting at Line' : lang === 'ko' ? '처리 중' : 'Đang hỗ trợ tại line')}
                  {activeCall.status === 'COMPLETED' && (lang === 'en' ? 'Completed' : lang === 'ko' ? '완료' : 'Đã hoàn thành')}
                  {activeCall.status === 'CANCELLED' && (lang === 'en' ? 'Cancelled' : lang === 'ko' ? 'Đã hủy' : 'Đã hủy')}
                </strong>
              </div>
              <span style={styles.timerBadge}>{formatCallTimer(elapsedSeconds * 1000)}</span>
            </div>

            <div style={styles.activeCallBody}>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: '#0f172a' }}>
                {lang === 'en' ? 'Category:' : lang === 'ko' ? '요청 항목:' : 'Loại hỗ trợ:'}{' '}
                <strong>{activeCall.categoryName}</strong>
              </p>

              {activeCall.assignedStaffName && (
                <p style={{ margin: '0 0 6px', fontSize: 13.5, color: '#047857', fontWeight: 600 }}>
                  <UserCheck size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                  {lang === 'en' ? 'Staff:' : lang === 'ko' ? '담당 직원:' : 'Nhân viên:'}{' '}
                  {activeCall.assignedStaffName}
                </p>
              )}

              <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                {activeCall.status === 'CREATED' &&
                  (lang === 'en'
                    ? 'Staff is being notified. We will be right there.'
                    : lang === 'ko'
                      ? '직원에게 전달되었습니다. 잠시만 기다려주세요.'
                      : 'Hệ thống đã phát chuông tới quầy. Nhân viên sẽ đến line ngay.')}
                {activeCall.status === 'ACKNOWLEDGED' &&
                  (lang === 'en'
                    ? 'Staff has accepted and is walking to your line.'
                    : lang === 'ko'
                      ? '직원이 확인하고 룸으로 이동 중입니다.'
                      : 'Nhân viên đã tiếp nhận và đang trên đường đến phòng.')}
                {activeCall.status === 'IN_PROGRESS' &&
                  (lang === 'en'
                    ? 'Staff is currently supporting you at the line.'
                    : lang === 'ko'
                      ? '직원이 지원 중입니다.'
                      : 'Nhân viên đang hỗ trợ tại line.')}
                {activeCall.status === 'COMPLETED' &&
                  (lang === 'en'
                    ? 'Thank you! Enjoy your golf session.'
                    : lang === 'ko'
                      ? '지원이 완료되었습니다. 즐거운 플레이 되세요!'
                      : 'Yêu cầu đã được phục vụ xong. Chúc quý khách buổi chơi vui vẻ!')}
              </p>
            </div>

            <div style={styles.activeCallFooter}>
              {['CREATED', 'ACKNOWLEDGED'].includes(activeCall.status) && (
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={handleCancelCall}
                  disabled={submitting}
                >
                  <X size={14} />
                  <span>{lang === 'en' ? 'Cancel' : lang === 'ko' ? '취소' : 'Hủy yêu cầu'}</span>
                </button>
              )}
              {['COMPLETED', 'CANCELLED'].includes(activeCall.status) && (
                <button
                  type="button"
                  style={styles.newCallBtn}
                  onClick={() => setActiveCall(null)}
                >
                  <RotateCcw size={14} />
                  <span>{lang === 'en' ? 'Send New Request' : lang === 'ko' ? '새 요청 보내기' : 'Gửi yêu cầu mới'}</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Categories Selection */}
        {!activeCall && (
          <>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>
                {lang === 'en' ? 'What do you need assistance with?' : lang === 'ko' ? '어떤 도움이 필요하신가요?' : 'Bạn cần hỗ trợ điều gì?'}
              </h3>
              <small style={{ color: '#64748b', fontSize: 12 }}>
                {lang === 'en' ? 'Touch an option below' : lang === 'ko' ? '항목을 선택해주세요' : 'Chạm để chọn'}
              </small>
            </div>

            <div style={styles.categoryGrid}>
              {info?.categories.map((cat) => {
                const isSelected = selectedCat?.id === cat.id;
                const IconComponent = ICON_MAP[cat.icon] || Bell;
                const title = cat[`name_${lang}`] || cat.name_vi;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    style={{
                      ...styles.catCard,
                      ...(isSelected ? styles.catCardSelected : {}),
                    }}
                    onClick={() => setSelectedCat(cat)}
                  >
                    <div
                      style={{
                        ...styles.catIconWrap,
                        ...(isSelected ? styles.catIconWrapSelected : {}),
                      }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <strong style={styles.catTitle}>{title}</strong>
                  </button>
                );
              })}
            </div>

            {/* Optional Note & Customer Info */}
            <div style={styles.formBox}>
              <label style={styles.fieldLabel}>
                {lang === 'en' ? 'Additional notes (optional):' : lang === 'ko' ? '추가 메모 (선택사항):' : 'Ghi chú thêm (không bắt buộc):'}
              </label>
              <input
                type="text"
                placeholder={
                  lang === 'en'
                    ? 'e.g. Need left-handed club, more water...'
                    : lang === 'ko'
                      ? '예: 생수 추가, 클럽 교체...'
                      : 'Ví dụ: Cần mượn gậy trái, thêm nước suối...'
                }
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                style={styles.textInput}
                maxLength={200}
              />

              {info?.guestMode === 'MODE_C' && (
                <div style={{ marginTop: 12 }}>
                  <label style={styles.fieldLabel}>
                    {lang === 'en' ? 'Phone number (optional):' : lang === 'ko' ? '전화번호 (선택사항):' : 'Số điện thoại (để nhân viên liên hệ lại):'}
                  </label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    style={styles.textInput}
                    maxLength={15}
                  />
                </div>
              )}
            </div>

            {/* Sticky Submit Button */}
            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.submitBtn}
                onClick={handleSubmitCall}
                disabled={submitting || !selectedCat}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="pos-m3-spin" />
                    <span>{lang === 'en' ? 'Sending...' : lang === 'ko' ? '전송 중...' : 'Đang gửi yêu cầu...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>
                      {lang === 'en'
                        ? `Call Staff for ${selectedCat ? selectedCat.name_en || selectedCat.name_vi : ''}`
                        : lang === 'ko'
                          ? `직원 호출 (${selectedCat ? selectedCat.name_ko || selectedCat.name_vi : ''})`
                          : `Gọi phục vụ (${selectedCat ? selectedCat.name_vi : ''})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modal for Mode B Phone Input */}
      {showPhoneModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={18} color="#047857" />
                <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                  {lang === 'en' ? 'Enter Phone Number' : lang === 'ko' ? '전화번호 입력' : 'Nhập số điện thoại'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
              {lang === 'en'
                ? 'Please provide your phone number so our staff can promptly assist you.'
                : lang === 'ko'
                  ? '직원이 확인 후 신속히 연락드릴 수 있도록 전화번호를 입력해주세요.'
                  : 'Cơ sở yêu cầu số điện thoại để nhân viên có thể đối chiếu và phục vụ chu đáo nhất.'}
            </p>
            <input
              type="tel"
              placeholder="09xx xxx xxx"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              style={styles.textInput}
              autoFocus
            />
            <button
              type="button"
              style={{ ...styles.submitBtn, marginTop: 14 }}
              onClick={handleSubmitCall}
              disabled={submitting || phoneInput.trim().length < 9}
            >
              {submitting ? 'Đang gửi...' : 'Xác nhận & Gọi ngay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  centerContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: '#f8fafc',
    textAlign: 'center',
  },
  errorCard: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 5,
    padding: 24,
    maxWidth: 380,
    width: '100%',
  },
  pageWrap: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 5,
    background: '#047857',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.5px',
  },
  clubName: {
    margin: 0,
    fontSize: 14.5,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  roomTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#047857',
    marginTop: 2,
  },
  langSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#f1f5f9',
    padding: '3px 6px',
    borderRadius: 5,
  },
  langBtn: {
    background: 'transparent',
    border: 'none',
    padding: '3px 6px',
    fontSize: 11.5,
    fontWeight: 600,
    color: '#64748b',
    borderRadius: 3,
    cursor: 'pointer',
  },
  langBtnActive: {
    background: '#ffffff',
    color: '#047857',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  main: {
    flex: 1,
    padding: '16px 18px 30px',
    maxWidth: 520,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  alertBanner: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: 13,
    padding: '10px 14px',
    borderRadius: 5,
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  activeCallCard: {
    background: '#ffffff',
    border: '1px solid #a7f3d0',
    borderRadius: 5,
    padding: 16,
    boxShadow: '0 2px 8px rgba(4, 120, 87, 0.08)',
    marginBottom: 18,
  },
  activeCallHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottom: '1px solid #f0fdf4',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#059669',
    boxShadow: '0 0 0 4px rgba(5, 150, 105, 0.25)',
  },
  timerBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: '#065f46',
    background: '#d1fae5',
    padding: '3px 8px',
    borderRadius: 4,
  },
  activeCallBody: {
    padding: '12px 0',
  },
  activeCallFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTop: '1px solid #f0fdf4',
  },
  cancelBtn: {
    background: '#ffffff',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  newCallBtn: {
    background: '#047857',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    margin: '0 0 3px',
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  catCard: {
    background: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: 5,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  catCardSelected: {
    borderColor: '#047857',
    background: '#f0fdf4',
    boxShadow: '0 2px 6px rgba(4, 120, 87, 0.12)',
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 5,
    background: '#f1f5f9',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconWrapSelected: {
    background: '#047857',
    color: '#ffffff',
  },
  catTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.3,
  },
  formBox: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 5,
    padding: 14,
    marginBottom: 18,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13.5,
    border: '1px solid #cbd5e1',
    borderRadius: 5,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  },
  actionRow: {
    position: 'sticky',
    bottom: 12,
    background: 'transparent',
  },
  submitBtn: {
    width: '100%',
    background: '#047857',
    color: '#ffffff',
    border: 'none',
    padding: '14px 18px',
    borderRadius: 5,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 99,
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: 5,
    padding: 18,
    maxWidth: 360,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
};
