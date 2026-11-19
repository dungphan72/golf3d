/**
 * Saigon Indoor Golf (SIGOLF) — Module Bãi Đậu Xe
 * Ticket Pass Generator & Offline Wallet Export
 */

import qrcode from 'qrcode-generator';

export function getQrDataUrl(data: string, cellSize = 4, margin = 1): string {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(data);
    qr.make();
    return qr.createDataURL(cellSize, margin);
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}`;
  }
}

/**
 * Renders high-resolution ticket pass (800x1260 px) onto HTML5 Canvas
 * and downloads it as a PNG image for offline storage on phones/desktops.
 */
export async function downloadTicketPassImage(ticket: {
  ticketCode?: string;
  ticket_code?: string;
  spotCode?: string;
  spot_code?: string;
  section?: string;
  licensePlate?: string;
  license_plate?: string;
  expectedIn?: number | string;
  expected_in?: number | string;
  expectedOut?: number | string;
  expected_out?: number | string;
  status?: string;
  feePayer?: string;
  fee_payer?: string;
  sponsoredAmount?: number;
  sponsored_amount?: number;
  paidAmount?: number;
  paid_amount?: number;
  totalAmount?: number;
  total_amount?: number;
  accessToken?: string;
  access_token?: string;
  customerName?: string;
  customer_name?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const tCode = ticket.ticketCode || ticket.ticket_code || 'PK-XXXX';
  const sCode = ticket.spotCode || ticket.spot_code || '--';
  const section = ticket.section || 'GoPick Parking';
  const plate = (ticket.licensePlate || ticket.license_plate || '').toUpperCase();
  const expIn = new Date(ticket.expectedIn || ticket.expected_in || Date.now());
  const expOut = new Date(ticket.expectedOut || ticket.expected_out || Date.now() + 2 * 3600 * 1000);
  const token = ticket.accessToken || ticket.access_token || '';
  const isSponsored = (ticket.feePayer || ticket.fee_payer) === 'gopick_sponsored' ||
    (ticket.sponsoredAmount || ticket.sponsored_amount || 0) >= (ticket.totalAmount || ticket.total_amount || 1);

  const qrPayload = `SIGOLF_PARKING:${tCode}:${token}`;
  const qrDataUrl = getQrDataUrl(qrPayload, 6, 2);

  // High-DPI canvas dimensions
  const width = 800;
  const height = 1260;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient: Soft modern lavender/slate
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#eef2ff');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer border & card container
  const margin = 32;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const radius = 28;

  // Draw Card Shadow & Background
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  // Top Header Banner (Purple accent)
  const headerH = 220;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, headerH, [radius, radius, 0, 0]);
  ctx.clip();

  const headGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + headerH);
  headGrad.addColorStop(0, '#4338ca');
  headGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = headGrad;
  ctx.fillRect(margin, margin, cardW, headerH);

  // Facility Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAIGON INDOOR GOLF — BÃI ĐỖ XE GOPICK', width / 2, margin + 50);

  ctx.font = '400 18px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.fillStyle = '#e0e7ff';
  ctx.fillText('250 Lương Định Của, P. An Khánh, TP. Thủ Đức', width / 2, margin + 82);

  // Spot Callout inside Header
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.fillText(`Ô ${sCode}`, width / 2, margin + 160);

  ctx.font = '600 20px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.fillStyle = '#c7d2fe';
  ctx.fillText(section, width / 2, margin + 195);
  ctx.restore();

  // QR Code Box
  const qrBoxSize = 340;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = margin + headerH + 36;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw QR Image into QR box
  await new Promise<void>((resolve) => {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      ctx.drawImage(qrImg, qrBoxX + 20, qrBoxY + 20, qrBoxSize - 40, qrBoxSize - 40);
      resolve();
    };
    qrImg.onerror = () => resolve();
    qrImg.src = qrDataUrl;
  });

  // Ticket Code Pill
  const pillY = qrBoxY + qrBoxSize + 28;
  ctx.font = '800 26px "Be Vietnam Pro", monospace';
  ctx.fillStyle = '#312e81';
  ctx.textAlign = 'center';
  ctx.fillText(`MÃ VÉ: ${tCode}`, width / 2, pillY);

  ctx.font = '500 18px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Đưa mã QR cho bảo vệ tại cổng bãi xe', width / 2, pillY + 30);

  // Perforated dividing line
  const dividerY = pillY + 60;
  ctx.save();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(margin + 20, dividerY);
  ctx.lineTo(margin + cardW - 20, dividerY);
  ctx.stroke();
  ctx.restore();

  // Ticket Details Rows
  const detailsY = dividerY + 36;
  const leftX = margin + 44;
  const rightX = margin + cardW - 44;
  const rowHeight = 44;

  const rows: Array<{ label: string; value: string; isPlate?: boolean; isHighlight?: boolean }> = [
    { label: 'Biển số xe', value: plate || '---', isPlate: true },
    { label: 'Ngày đỗ xe', value: expIn.toISOString().slice(0, 10) },
    {
      label: 'Khung giờ đỗ',
      value: `${expIn.toTimeString().slice(0, 5)} – ${expOut.toTimeString().slice(0, 5)}`,
    },
    {
      label: 'Trạng thái',
      value: ticket.status === 'completed' ? 'ĐÃ RA BÃI' : ticket.status === 'active' ? 'ĐANG TRONG BÃI' : 'ĐÃ XÁC NHẬN',
    },
    {
      label: 'Thanh toán',
      value: isSponsored ? 'GoPick tài trợ 100%' : 'Đã thanh toán',
      isHighlight: true,
    },
  ];

  rows.forEach((r, idx) => {
    const y = detailsY + idx * rowHeight;
    ctx.textAlign = 'left';
    ctx.font = '500 20px "Be Vietnam Pro", -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(r.label, leftX, y);

    ctx.textAlign = 'right';
    if (r.isPlate) {
      // Plate styling
      ctx.font = '800 24px "Be Vietnam Pro", monospace';
      ctx.fillStyle = '#0f172a';
    } else if (r.isHighlight) {
      ctx.font = '700 21px "Be Vietnam Pro", -apple-system, sans-serif';
      ctx.fillStyle = isSponsored ? '#059669' : '#4338ca';
    } else {
      ctx.font = '600 21px "Be Vietnam Pro", -apple-system, sans-serif';
      ctx.fillStyle = '#1e293b';
    }
    ctx.fillText(r.value, rightX, y);
  });

  // Footer Note
  const footerY = margin + cardH - 30;
  ctx.textAlign = 'center';
  ctx.font = '500 16px "Be Vietnam Pro", -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Thẻ vé điện tử lưu offline · Hỗ trợ: 0909.xxx.xxx · Sigolf.vn', width / 2, footerY);

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Ve-Xe-${tCode}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
