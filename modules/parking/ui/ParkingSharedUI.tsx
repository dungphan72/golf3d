'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Sun, X } from 'lucide-react';

export function formatDisplayDate(isoDateStr: string, lang: 'vi' | 'en' | 'ko' = 'vi'): string {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) return isoDateStr;
  const [y, m, d] = isoDateStr.split('-');
  if (lang === 'ko') return `${y}.${m}.${d}`;
  return `${d}/${m}/${y}`;
}

export function addHoursToTime(timeIn: string, hoursToAdd: number): string {
  const parts = timeIn.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return timeIn;
  const totalMinutes = (parts[0] * 60 + parts[1] + Math.round(hoursToAdd * 60)) % (24 * 60);
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const LEGEND_LABELS = {
  vi: {
    available: 'Trống',
    selected: 'Đang chọn',
    booked: 'Đã đặt / giữ',
    occupied: 'Có xe',
  },
  en: {
    available: 'Available',
    selected: 'Selected',
    booked: 'Booked / Held',
    occupied: 'Occupied',
  },
  ko: {
    available: '빈자리',
    selected: '선택됨',
    booked: '예약됨',
    occupied: '주차중',
  },
} as const;

export function ParkingMapLegend({ lang = 'vi' }: { lang?: 'vi' | 'en' | 'ko' }) {
  const labels = LEGEND_LABELS[lang] || LEGEND_LABELS.vi;
  return (
    <div className="pk-map-legend" role="note" aria-label="Chú thích trạng thái ô đỗ">
      <span className="pk-map-legend-item">
        <span className="pk-map-legend-swatch is-available" />
        <span>{labels.available}</span>
      </span>
      <span className="pk-map-legend-item">
        <span className="pk-map-legend-swatch is-selected" />
        <span>{labels.selected}</span>
      </span>
      <span className="pk-map-legend-item">
        <span className="pk-map-legend-swatch is-booked" />
        <span>{labels.booked}</span>
      </span>
      <span className="pk-map-legend-item">
        <span className="pk-map-legend-swatch is-occupied" />
        <span>{labels.occupied}</span>
      </span>
    </div>
  );
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
}

export function ParkingConfirmModal({
  dialog,
  onClose,
}: {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) return null;
  const isDanger = dialog.tone === 'danger';
  return (
    <div
      className="pk-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pk-confirm-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="pk-card pk-modal-box"
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#ffffff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isDanger ? '#fef2f2' : '#f0fdf4',
              color: isDanger ? '#dc2626' : 'var(--pk-primary)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {isDanger ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <h3 id="pk-confirm-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            {dialog.title}
          </h3>
        </div>
        <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '0 0 18px' }}>
          {dialog.message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="pk-btn-secondary"
            style={{ width: 'auto', padding: '0 16px', height: 40 }}
            onClick={onClose}
          >
            {dialog.cancelLabel || 'Hủy'}
          </button>
          <button
            type="button"
            className="pk-btn-primary"
            style={{
              width: 'auto',
              padding: '0 18px',
              height: 40,
              background: isDanger ? '#dc2626' : 'var(--pk-primary)',
              borderColor: isDanger ? '#dc2626' : 'var(--pk-primary)',
            }}
            onClick={() => {
              const fn = dialog.onConfirm;
              onClose();
              fn();
            }}
          >
            {dialog.confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ParkingQrBrightModal({
  open,
  onClose,
  ticketCode,
  spotCode,
  licensePlate,
  qrDataUrl,
}: {
  open: boolean;
  onClose: () => void;
  ticketCode: string;
  spotCode: string;
  licensePlate: string;
  qrDataUrl: string;
}) {
  if (!open) return null;
  return (
    <div
      className="pk-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Mã QR độ tương phản cao"
      style={{ background: '#ffffff', zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 24,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          background: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: '#fef9c3', color: '#854d0e', fontSize: 12, fontWeight: 700 }}>
          <Sun size={15} />
          <span>Chế độ sáng tối đa để quét tại cổng</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--pk-primary)' }}>
          Ô {spotCode} · {licensePlate}
        </div>
        {qrDataUrl && (
          <div style={{ padding: 16, background: '#ffffff', border: '3px solid #0f172a', borderRadius: 16 }}>
            <img src={qrDataUrl} alt={`QR ${ticketCode}`} style={{ width: 250, height: 250, display: 'block' }} />
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: '#0f172a' }}>
          {ticketCode}
        </div>
        <button
          type="button"
          className="pk-btn-primary"
          style={{ maxWidth: 220, marginTop: 8 }}
          onClick={onClose}
        >
          <X size={16} />
          <span>Đóng chế độ quét</span>
        </button>
      </div>
    </div>
  );
}
