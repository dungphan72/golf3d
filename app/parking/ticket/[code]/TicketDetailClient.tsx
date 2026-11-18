'use client';
/* eslint-disable @next/next/no-img-element */

import { Navigation, Check } from 'lucide-react';
import { money } from '../../../../lib/club';

export default function TicketDetailClient({ ticket }: { ticket: any }) {
  const dateStr = new Date(ticket.expected_in).toISOString().slice(0, 10);
  const timeInStr = new Date(ticket.expected_in).toTimeString().slice(0, 5);
  const timeOutStr = new Date(ticket.expected_out).toTimeString().slice(0, 5);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="pk-page-title">Vé đậu xe SIGOLF</h2>
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
          <Check size={13} strokeWidth={3} /> {ticket.status === 'completed' ? 'Đã ra bãi' : ticket.status === 'active' ? 'Đang trong bãi' : 'Đã xác nhận'}
        </span>
      </div>

      <div className="pk-ticket-stub">
        <div className="pk-ticket-head">
          <div className="pk-ticket-facility">Bãi xe GoPick</div>
          <div className="pk-ticket-spot">Ô {ticket.spot_code}</div>

          <div className="pk-ticket-qr">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                `SIGOLF-PK:${ticket.ticket_code}:${ticket.access_token}`,
              )}`}
              alt="Mã QR vé đậu xe"
              className="pk-ticket-qr-img"
            />
            <span className="pk-ticket-code">Mã vé: {ticket.ticket_code}</span>
          </div>
        </div>

        <div className="pk-ticket-details">
          <div className="pk-ticket-row">
            <span className="pk-ticket-row-label">🚗 Biển số xe</span>
            <span className="pk-ticket-row-val">{ticket.license_plate}</span>
          </div>
          <div className="pk-ticket-row">
            <span className="pk-ticket-row-label">📅 Ngày đậu xe</span>
            <span className="pk-ticket-row-val">{dateStr}</span>
          </div>
          <div className="pk-ticket-row">
            <span className="pk-ticket-row-label">⏱ Thời gian</span>
            <span className="pk-ticket-row-val">{timeInStr} – {timeOutStr}</span>
          </div>
          <div
            className="pk-ticket-row"
            style={{
              paddingTop: 8,
              borderTop: '1px solid var(--pk-border)',
            }}
          >
            <span className="pk-ticket-row-label" style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>
              {ticket.status === 'completed' ? 'Tổng thanh toán' : '✓ Đã thanh toán'}
            </span>
            <span className="pk-ticket-row-val" style={{ color: 'var(--pk-primary)', fontSize: 15 }}>
              {ticket.sponsored_amount >= ticket.base_amount
                ? '0 đ (GoPick tài trợ)'
                : money(ticket.paid_amount || ticket.total_amount)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <a
          href="https://maps.google.com/?q=250+Luong+Dinh+Cua"
          target="_blank"
          rel="noreferrer"
          className="pk-btn-primary"
          style={{ textDecoration: 'none' }}
        >
          <Navigation size={16} />
          <span>Chỉ đường đến bãi xe</span>
        </a>
      </div>
    </div>
  );
}
