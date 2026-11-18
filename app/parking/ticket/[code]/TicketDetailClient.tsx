'use client';
/* eslint-disable @next/next/no-img-element */

import { Navigation, Check, ArrowLeft, Home, MapPin, Calendar, Clock, Car } from 'lucide-react';
import { money } from '../../../../lib/club';

export default function TicketDetailClient({ ticket }: { ticket: any }) {
  const dateStr = new Date(ticket.expected_in).toISOString().slice(0, 10);
  const timeInStr = new Date(ticket.expected_in).toTimeString().slice(0, 5);
  const timeOutStr = new Date(ticket.expected_out).toTimeString().slice(0, 5);

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
          <span>Bãi xe</span>
        </a>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5 }}>SIGOLF · GOPICK</div>
          <strong style={{ fontSize: 14 }}>Vé Điện Tử</strong>
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
          <span>SIGOLF</span>
        </a>
      </header>

      {/* Ticket Body */}
      <div style={{ padding: '20px 16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>Mã vé: <strong>{ticket.ticket_code}</strong></span>
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

        {/* Ticket Stub with perforated look */}
        <div className="pk-ticket-stub" style={{ background: '#ffffff', border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)', overflow: 'hidden' }}>
          <div style={{ background: 'var(--pk-primary-light)', padding: '20px 16px', textAlign: 'center', borderBottom: '1px dashed var(--pk-primary-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--pk-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Bãi xe GoPick — 250 Lương Định Của
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--pk-primary)', margin: '6px 0 2px' }}>
              Ô {ticket.spot_code}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              {ticket.section || 'GoPick'}
            </div>

            {/* QR Code */}
            <div style={{ margin: '14px auto 8px', width: 170, height: 170, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `SIGOLF_PARKING:${ticket.ticket_code}:${ticket.access_token}`,
                )}`}
                alt="QR Code"
                style={{ width: 150, height: 150 }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
              Đưa mã QR cho bảo vệ khi vào/ra cổng
            </div>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Car size={15} /> Biển số xe
              </span>
              <strong style={{ fontSize: 14 }}>{ticket.license_plate}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} /> Ngày đậu
              </span>
              <span>{dateStr}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--pk-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={15} /> Khung giờ
              </span>
              <span>{timeInStr} – {timeOutStr}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                paddingTop: 8,
                borderTop: '1px solid var(--pk-border)',
              }}
            >
              <span style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>
                {ticket.status === 'completed' ? 'Tổng thanh toán' : '✓ Đã thanh toán'}
              </span>
              <strong style={{ color: 'var(--pk-primary)', fontSize: 15 }}>
                {ticket.sponsored_amount >= ticket.base_amount
                  ? '0 đ (GoPick tài trợ)'
                  : money(ticket.paid_amount || ticket.total_amount)}
              </strong>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href="https://maps.google.com/?q=250+Luong+Dinh+Cua"
            target="_blank"
            rel="noreferrer"
            className="pk-btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <Navigation size={16} />
            <span>Chỉ đường đến bãi xe (Google Maps)</span>
          </a>

          <a
            href="/parking"
            className="pk-btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <span>Quay lại trang Đặt chỗ</span>
          </a>
        </div>
      </div>
    </div>
  );
}
