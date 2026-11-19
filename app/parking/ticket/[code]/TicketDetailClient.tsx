'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useEffect } from 'react';
import {
  Navigation,
  Check,
  ArrowLeft,
  Home,
  Calendar,
  Clock,
  Car,
  Download,
  PlusCircle,
  X,
} from 'lucide-react';
import { money } from '../../../../lib/club';
import { getQrDataUrl, downloadTicketPassImage } from '../../../../modules/parking/core/ticket-pass';

interface Props {
  code?: string;
  initialTicket?: any;
  token?: string;
}

export default function TicketDetailClient({ code, initialTicket, token: propToken }: Props) {
  const [ticket, setTicket] = useState<any>(initialTicket);
  const [loading, setLoading] = useState<boolean>(!initialTicket);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState<number>(1);
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState('');
  const [extendSuccess, setExtendSuccess] = useState('');

  // Fallback client-side fetch if ticket wasn't pre-rendered
  useEffect(() => {
    if (!ticket && code) {
      setLoading(true);
      fetch(`/api/parking?action=ticket&code=${encodeURIComponent(code)}`)
        .then((r) => r.json())
        .then((data: any) => {
          if (data.ok && data.ticket) {
            setTicket(data.ticket);
          } else {
            setError(data.error || 'Không tìm thấy vé đậu xe');
          }
        })
        .catch(() => setError('Lỗi kết nối khi tải vé'))
        .finally(() => setLoading(false));
    }
  }, [code, ticket]);

  const expIn = useMemo(() => {
    if (!ticket) return new Date();
    return new Date(ticket.expected_in || ticket.expectedIn || Date.now());
  }, [ticket]);

  const expOut = useMemo(() => {
    if (!ticket) return new Date(Date.now() + 2 * 3600 * 1000);
    return new Date(ticket.expected_out || ticket.expectedOut || Date.now() + 2 * 3600 * 1000);
  }, [ticket]);

  const dateStr = expIn.toISOString().slice(0, 10);
  const timeInStr = expIn.toTimeString().slice(0, 5);
  const timeOutStr = expOut.toTimeString().slice(0, 5);

  const tCode = ticket?.ticket_code || ticket?.ticketCode || code || 'PK-XXXX';
  const token = ticket?.access_token || ticket?.accessToken || propToken || '';
  const qrDataUrl = useMemo(
    () => getQrDataUrl(`SIGOLF_PARKING:${tCode}:${token}`, 5, 2),
    [tCode, token],
  );

  const isSponsored =
    ticket?.fee_payer === 'gopick_sponsored' ||
    ticket?.feePayer === 'gopick_sponsored' ||
    (ticket?.sponsored_amount || ticket?.sponsoredAmount || 0) >=
      (ticket?.total_amount || ticket?.totalAmount || 1);

  // Time calculations
  const now = Date.now();
  const diffMins = Math.floor((expOut.getTime() - now) / 60000);

  const handleDownload = async () => {
    if (!ticket) return;
    try {
      setDownloading(true);
      await downloadTicketPassImage(ticket);
    } finally {
      setDownloading(false);
    }
  };

  const handleExtendSubmit = async () => {
    if (!ticket) return;
    try {
      setExtending(true);
      setExtendError('');
      setExtendSuccess('');

      const res = await fetch('/api/parking?action=extend-stay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: tCode,
          accessToken: token,
          extraMinutes: extendHours * 60,
          paymentMethod: isSponsored ? 'gopick_sponsored' : 'vietqr',
        }),
      });

      const data: any = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể gia hạn đỗ xe lúc này');
      }

      setTicket(data.ticket);
      setExtendSuccess(
        `Gia hạn thành công thêm ${extendHours} giờ! Giờ ra mới: ${new Date(
          data.ticket.expectedOut || data.ticket.expected_out,
        ).toTimeString().slice(0, 5)}`,
      );
      setTimeout(() => {
        setShowExtendModal(false);
        setExtendSuccess('');
      }, 2000);
    } catch (err: any) {
      setExtendError(err.message || 'Lỗi hệ thống khi gia hạn vé');
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14 }}>Đang tải thẻ vé...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '32px 20px', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Không tìm thấy vé đậu xe</h2>
          <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
            {error || `Mã vé ${code || ''} không tồn tại trên hệ thống hoặc đường dẫn chưa chính xác.`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/parking" className="pk-btn-primary" style={{ textDecoration: 'none', height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Quay lại Đặt chỗ bãi xe
            </a>
            <a href="/" className="pk-btn-secondary" style={{ textDecoration: 'none', height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Trang chủ SIGOLF
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header */}
      <header
        style={{
          background: 'var(--pk-primary)',
          color: '#ffffff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <a
          href="/parking"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={18} />
          <span>Đặt chỗ</span>
        </a>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5 }}>SIGOLF · GOPICK</div>
          <strong style={{ fontSize: 14 }}>Thẻ Vé Điện Tử</strong>
        </div>

        <a
          href="/"
          title="Về SIGOLF"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: 'var(--pk-radius)',
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          <Home size={14} />
          <span>Trang chủ</span>
        </a>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '16px', flex: 1 }}>
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>
            Mã vé: <strong style={{ color: '#0f172a' }}>{tCode}</strong>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--pk-primary-light)',
              border: '1px solid var(--pk-primary-border)',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--pk-primary)',
            }}
          >
            <Check size={13} strokeWidth={3} />
            {ticket.status === 'completed'
              ? 'Đã ra bãi'
              : ticket.status === 'active'
              ? 'Đang trong bãi'
              : 'Đã xác nhận'}
          </span>
        </div>

        {/* Countdown alerts */}
        {ticket.status !== 'completed' && (
          <div style={{ marginBottom: 14 }}>
            {diffMins > 15 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  ⏱ Còn lại: <strong>{Math.floor(diffMins / 60)}h {diffMins % 60}m</strong> (đến {timeOutStr})
                </span>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(true)}
                  style={{
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    color: 'var(--pk-primary)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <PlusCircle size={13} />
                  <span>Gia hạn</span>
                </button>
              </div>
            ) : diffMins > 0 ? (
              <div
                style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12.5,
                  color: '#854d0e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  ⚠️ <strong>Sắp hết giờ:</strong> Còn {diffMins} phút là đến giờ ra ({timeOutStr}).
                </span>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(true)}
                  style={{
                    background: '#ca8a04',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Gia hạn ngay
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12.5,
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  ⚠️ <strong>Quá giờ {Math.abs(diffMins)} phút:</strong> Phụ thu ngoài giờ tính tại cổng.
                </span>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(true)}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Gia hạn bù
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ticket Stub Card */}
        <div
          className="pk-ticket-stub"
          style={{
            background: '#ffffff',
            border: '1px solid var(--pk-border)',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          {/* Top colored stub */}
          <div
            style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
              padding: '20px 16px',
              textAlign: 'center',
              borderBottom: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--pk-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Bãi xe GoPick — 250 Lương Định Của
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--pk-primary)', margin: '6px 0 2px' }}>
              Ô {ticket.spot_code || ticket.spotCode}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              {ticket.section || 'GoPick Parking'}
            </div>

            {/* Offline QR Code Box */}
            <div
              style={{
                margin: '16px auto 10px',
                width: 176,
                height: 176,
                background: '#ffffff',
                padding: 10,
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={qrDataUrl} alt="Offline QR Code" style={{ width: 156, height: 156 }} />
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
              Đưa mã QR cho bảo vệ khi vào/ra cổng
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Mã hoạt động 100% không cần kết nối mạng
            </div>
          </div>

          {/* Ticket Information Table */}
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Car size={16} /> Biển số xe
              </span>
              <strong style={{ fontSize: 15, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                {ticket.license_plate || ticket.licensePlate}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} /> Ngày đậu
              </span>
              <span>{dateStr}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> Khung giờ
              </span>
              <span style={{ fontWeight: 600 }}>
                {timeInStr} – {timeOutStr}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13.5,
                paddingTop: 10,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <span style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>
                {ticket.status === 'completed' ? 'Tổng thanh toán' : '✓ Đã thanh toán'}
              </span>
              <strong style={{ color: isSponsored ? '#059669' : 'var(--pk-primary)', fontSize: 15 }}>
                {isSponsored
                  ? '0 đ (GoPick tài trợ)'
                  : money(ticket.paid_amount || ticket.paidAmount || ticket.total_amount || ticket.totalAmount)}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Download offline image */}
          <button
            type="button"
            className="pk-btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              height: 48,
              fontSize: 14.5,
              background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
            }}
          >
            <Download size={17} />
            <span>{downloading ? 'Đang tạo ảnh...' : 'Lưu ảnh vé vào máy (Offline)'}</span>
          </button>

          {/* Extend stay button */}
          {ticket.status !== 'completed' && (
            <button
              type="button"
              className="pk-btn-secondary"
              onClick={() => setShowExtendModal(true)}
              style={{ height: 44, fontSize: 14 }}
            >
              <Clock size={16} />
              <span>Gia hạn thêm giờ đỗ xe</span>
            </button>
          )}

          {/* Google Maps Directions */}
          <a
            href="https://maps.google.com/?q=250+Luong+Dinh+Cua"
            target="_blank"
            rel="noreferrer"
            className="pk-btn-secondary"
            style={{ textDecoration: 'none', height: 44, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Navigation size={16} />
            <span>Chỉ đường đến bãi xe (Google Maps)</span>
          </a>
        </div>
      </div>

      {/* Stay Extension Modal */}
      {showExtendModal && (
        <div
          className="pk-modal-overlay"
          onClick={() => setShowExtendModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 18,
              maxWidth: 420,
              width: '100%',
              padding: '24px 20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowExtendModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              🕒 Gia hạn đỗ xe
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Gia hạn thêm thời gian đỗ tại ô <strong>{ticket.spot_code || ticket.spotCode}</strong> (Xe: {ticket.license_plate || ticket.licensePlate})
            </p>

            {extendError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#991b1b',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                ⚠️ {extendError}
              </div>
            )}

            {extendSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#166534',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                ✓ {extendSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                Chọn thời gian gia hạn:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[1, 2, 3].map((h) => {
                  const isSelected = extendHours === h;
                  const price = isSponsored ? 0 : h * 20000;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendHours(h)}
                      style={{
                        padding: '12px 6px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--pk-primary)' : '1px solid #cbd5e1',
                        background: isSelected ? '#eef2ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? 'var(--pk-primary)' : '#1e293b' }}>
                        +{h} Giờ
                      </div>
                      <div style={{ fontSize: 12, color: isSelected ? 'var(--pk-primary)' : '#64748b', marginTop: 2 }}>
                        {isSponsored ? 'Tài trợ' : `${money(price)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Giờ ra mới dự kiến:</span>
                <strong style={{ color: '#0f172a' }}>
                  {new Date(expOut.getTime() + extendHours * 3600 * 1000).toTimeString().slice(0, 5)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phí gia hạn:</span>
                <strong style={{ color: isSponsored ? '#059669' : 'var(--pk-primary)', fontSize: 14 }}>
                  {isSponsored ? '0 đ (GoPick tài trợ)' : money(extendHours * 20000)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowExtendModal(false)}
                style={{ flex: 1, height: 44 }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleExtendSubmit}
                disabled={extending}
                style={{ flex: 2, height: 44 }}
              >
                {extending ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
