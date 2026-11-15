import { BRAND } from './brand';
import { money, type Booking } from './club';
import type { Bill } from './pricing';
import type { BillInfo } from './billing';
import type { FoodData, FoodLine } from './fnb';

export function formatBillZaloText({
  booking,
  quote: q,
  bill,
  roomName,
  food,
}: {
  booking: Booking;
  quote: Bill;
  bill?: BillInfo | null;
  roomName: string;
  food?: FoodData | null;
}): string {
  const code = '#' + booking.id.slice(-6).toUpperCase();
  const startTime = new Date(booking.started || booking.start).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const dateStr = new Date(booking.started || booking.start).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const lines: string[] = [
    `⛳ ${BRAND.name.toUpperCase()} - HÓA ĐƠN THANH TOÁN`,
    '------------------------------------------',
    `Phòng: ${roomName} · Số phiếu: ${code}`,
    `Khách hàng: ${booking.customer}${booking.phone ? ` (${booking.phone})` : ''}`,
    `Thời gian: ${startTime} ngày ${dateStr}`,
    '------------------------------------------',
  ];

  for (const l of q.lines) {
    lines.push(`• ${l.label}: ${money(Math.round(l.amount))}`);
  }

  if (food && food.orders.length > 0) {
    const servedOrders = food.orders.filter((o) => o.status === 'served');
    if (servedOrders.length > 0) {
      lines.push('--- Dịch vụ F&B ---');
      for (const ord of servedOrders) {
        try {
          const items = JSON.parse(ord.items) as FoodLine[];
          for (const item of items) {
            lines.push(`• ${item.name} x${item.qty}: ${money(item.price * item.qty)}`);
          }
        } catch {
          // ignore json parse error
        }
      }
    }
  }

  if (q.fee > 0) {
    lines.push(`• Phí dịch vụ: ${money(q.fee)}`);
  }
  if (q.vat > 0) {
    lines.push(`• VAT: ${money(q.vat)}`);
  }

  if (bill?.discount) {
    lines.push(`• Giảm giá: -${money(bill.discount.amount)} (${bill.discount.reason})`);
  }

  const total = booking.amount ?? q.total + (booking.food_total ?? 0);
  lines.push('------------------------------------------');
  lines.push(`TỔNG CỘNG: ${money(total)}`);

  const paymentLabel =
    booking.payment === 'cash'
      ? 'Tiền mặt'
      : booking.payment === 'transfer'
        ? 'Chuyển khoản VietQR'
        : booking.payment === 'card'
          ? 'Quẹt thẻ'
          : booking.payment === 'wallet'
            ? 'Ví hội viên'
          : booking.payment === 'package'
            ? 'Gói hội viên'
            : booking.payment === 'mixed'
              ? 'Chia nhiều hình thức'
              : '';

  if (booking.status === 'paid') {
    lines.push(`Trạng thái: ĐÃ THANH TOÁN${paymentLabel ? ` (${paymentLabel})` : ''}`);
  } else {
    lines.push('Trạng thái: CHỜ THANH TOÁN');
  }

  lines.push('------------------------------------------');
  lines.push('Cảm ơn Quý khách & Hẹn gặp lại!');
  lines.push(`Hotline: ${BRAND.hotline} · Website: ${BRAND.website}`);

  return lines.join('\n');
}

export function generateK80Html({
  booking,
  quote: q,
  bill,
  roomName,
  food,
}: {
  booking: Booking;
  quote: Bill;
  bill?: BillInfo | null;
  roomName: string;
  food?: FoodData | null;
}): string {
  const code = '#' + booking.id.slice(-6).toUpperCase();
  const startTime = new Date(booking.started || booking.start).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const dateStr = new Date(booking.started || booking.start).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const total = booking.amount ?? q.total + (booking.food_total ?? 0);

  const paymentLabel =
    booking.payment === 'cash'
      ? 'Tiền mặt'
      : booking.payment === 'transfer'
        ? 'Chuyển khoản'
        : booking.payment === 'card'
          ? 'Quẹt thẻ'
          : booking.payment === 'wallet'
            ? 'Ví hội viên'
          : booking.payment === 'package'
            ? 'Gói hội viên'
            : booking.payment === 'mixed'
              ? 'Nhiều hình thức'
              : 'Chưa thanh toán';

  const servedOrders = food?.orders.filter((o) => o.status === 'served') ?? [];
  const foodLines: FoodLine[] = [];
  for (const ord of servedOrders) {
    try {
      const items = JSON.parse(ord.items) as FoodLine[];
      foodLines.push(...items);
    } catch {
      // ignore
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu thanh toán ${code}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 1.5mm 2mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: 72mm;
      margin: 0 auto;
      padding: 1mm 0 4mm 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .header { text-align: center; margin-bottom: 6px; }
    .club-title { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
    .club-sub { font-size: 10px; color: #222; margin-top: 2px; }
    .bill-heading { font-size: 13.5px; font-weight: 800; text-transform: uppercase; margin: 6px 0 4px 0; }
    .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
    .solid-divider { border-bottom: 1.5px solid #000; margin: 6px 0; }
    .meta-table { width: 100%; font-size: 11px; margin-bottom: 4px; }
    .meta-table td { padding: 1px 0; vertical-align: top; }
    .meta-right { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .items-table td { padding: 2.5px 0; font-size: 11px; vertical-align: top; }
    .items-table .desc { width: 62%; }
    .items-table .val { width: 38%; text-align: right; font-weight: 600; white-space: nowrap; }
    .sub-desc { font-size: 9.5px; color: #444; display: block; }
    .total-row { display: flex; justify-content: space-between; font-size: 14.5px; font-weight: 800; padding: 4px 0; }
    .status-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; }
    .footer { text-align: center; margin-top: 8px; font-size: 10px; color: #333; }
    .footer-thanks { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="club-title">${BRAND.name}</div>
    <div class="club-sub">Hotline: ${BRAND.hotline} · www.${BRAND.website}</div>
    <div class="club-sub">${BRAND.address}</div>
  </div>

  <div class="divider"></div>
  <div class="center bill-heading">${booking.status === 'paid' ? 'PHIẾU THANH TOÁN' : 'PHIẾU TẠM TÍNH'}</div>

  <table class="meta-table">
    <tr>
      <td>Phòng: <strong>${roomName}</strong></td>
      <td class="meta-right">Số: <strong>${code}</strong></td>
    </tr>
    <tr>
      <td>Khách: <strong>${booking.customer}</strong></td>
      <td class="meta-right">${booking.phone || ''}</td>
    </tr>
    <tr>
      <td>Giờ vào: ${startTime}</td>
      <td class="meta-right">Ngày: ${dateStr}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table class="items-table">
    ${q.lines
      .map(
        (l) => `
      <tr>
        <td class="desc">
          ${l.label}
          ${l.from != null && l.to != null ? `<span class="sub-desc">${new Date(l.from).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}–${new Date(l.to).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })} (${l.minutes.toFixed(0)}p)</span>` : ''}
        </td>
        <td class="val">${money(Math.round(l.amount))}</td>
      </tr>`,
      )
      .join('')}

    ${
      foodLines.length > 0
        ? `
      <tr><td colspan="2" style="font-weight: 700; padding-top: 4px; font-size: 10.5px;">Dịch vụ F&B:</td></tr>
      ${foodLines
        .map(
          (i) => `
        <tr>
          <td class="desc" style="padding-left: 6px;">• ${i.name} (x${i.qty})</td>
          <td class="val">${money(i.price * i.qty)}</td>
        </tr>`,
        )
        .join('')}
    `
        : ''
    }

    ${
      q.fee > 0
        ? `
      <tr>
        <td class="desc">Phí dịch vụ</td>
        <td class="val">${money(q.fee)}</td>
      </tr>`
        : ''
    }

    ${
      q.vat > 0
        ? `
      <tr>
        <td class="desc">VAT (${Math.round((q.vat / Math.max(1, q.subtotal)) * 100)}%)</td>
        <td class="val">${money(q.vat)}</td>
      </tr>`
        : ''
    }

    ${
      bill?.discount
        ? `
      <tr>
        <td class="desc">Giảm giá: ${bill.discount.reason}</td>
        <td class="val" style="color: #000;">-${money(bill.discount.amount)}</td>
      </tr>`
        : ''
    }
  </table>

  <div class="solid-divider"></div>

  <div class="total-row">
    <span>TỔNG CỘNG:</span>
    <span>${money(total)}</span>
  </div>

  <div class="status-row">
    <span>Hình thức:</span>
    <span class="bold">${paymentLabel}</span>
  </div>
  <div class="status-row">
    <span>Trạng thái:</span>
    <span class="bold">${booking.status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}</span>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div class="footer-thanks">Cảm ơn Quý khách & Hẹn gặp lại!</div>
    <div>Hệ thống Golf 3D Foresight GC3 USA</div>
  </div>
</body>
</html>`;
}

export function printK80Receipt(html: string) {
  const existing = document.getElementById('k80-receipt-print-iframe') as HTMLIFrameElement | null;
  if (existing) {
    existing.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'k80-receipt-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 200);
}

export async function sendBillToZalo({
  phone,
  billText,
  onNotify,
}: {
  phone?: string;
  billText: string;
  onNotify?: (msg: string) => void;
}) {
  let targetPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!targetPhone) {
    const input = window.prompt('Nhập số điện thoại Zalo của khách:', '');
    if (!input) return;
    targetPhone = input.replace(/[^0-9]/g, '');
  }

  if (targetPhone.length < 9) {
    alert('Số điện thoại không hợp lệ. Vui lòng kiểm tra lại!');
    return;
  }

  if (targetPhone.startsWith('84') && targetPhone.length >= 10) {
    targetPhone = '0' + targetPhone.slice(2);
  }

  try {
    await navigator.clipboard.writeText(billText);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = billText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  window.open(`https://zalo.me/${targetPhone}`, '_blank');

  if (onNotify) {
    onNotify('Đã sao chép hóa đơn! Khi cửa sổ Zalo mở ra, bạn chỉ cần bấm Ctrl+V để gửi cho khách.');
  }
}

/** Kitchen / Bar Order Ticket for thermal K80 printer */
export function generateKitchenTicketHtml({
  roomName,
  code,
  items,
  note,
  cashierName,
}: {
  roomName: string;
  code: string;
  items: { name: string; qty: number; note?: string }[];
  note?: string;
  cashierName?: string;
}): string {
  const timeStr = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const dateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu chế biến Bếp/Bar - ${roomName}</title>
  <style>
    @page { size: 80mm auto; margin: 1.5mm 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      width: 72mm;
      margin: 0 auto;
      padding: 2mm 0;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
    .room-badge { font-size: 18px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin: 4px 0; border-radius: 4px; }
    .divider { border-bottom: 2px dashed #000; margin: 8px 0; }
    .meta { font-size: 11px; margin-bottom: 6px; }
    .item-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; padding: 6px 0; border-bottom: 1px solid #ddd; }
    .item-qty { font-size: 16px; font-weight: 900; min-width: 36px; text-align: right; }
    .note-box { background: #f0f0f0; padding: 6px; font-size: 11px; margin-top: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="center title">PHIẾU BẾP / PHA CHẾ</div>
  <div class="center room-badge">${roomName}</div>
  <div class="center meta">Đơn: #${code} · Giờ: ${timeStr} · Ngày: ${dateStr}</div>
  ${cashierName ? `<div class="center meta">Thu ngân: ${cashierName}</div>` : ''}

  <div class="divider"></div>

  <div>
    ${items
      .map(
        (it) => `
      <div class="item-row">
        <span>• ${it.name}</span>
        <span class="item-qty">x${it.qty}</span>
      </div>
      ${it.note ? `<div style="font-size: 11px; color: #444; padding-left: 10px;">Ghi chú: ${it.note}</div>` : ''}
    `,
      )
      .join('')}
  </div>

  ${note ? `<div class="note-box"><strong>Lưu ý:</strong> ${note}</div>` : ''}

  <div class="divider"></div>
  <div class="center" style="font-size: 11px; margin-top: 6px;">--- Vui lòng ra món đúng line ---</div>
</body>
</html>`;
}

/** Trigger Cash Drawer pulse (ESC/POS or Web Serial / Audio chime fallback) */
export function kickCashDrawer() {
  try {
    // 1. Audio chime to notify staff that cash drawer is opened
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}

/** Shift Z-Report (Báo cáo kết ca / bàn giao ca) for K80 thermal printer */
export function generateShiftZReportHtml({
  shiftName,
  cashierName,
  openedAt,
  closedAt,
  openingCash,
  countedCash,
  countedTransfer,
  countedCard,
  cashIn = 0,
  cashOut = 0,
  systemCash = 0,
  systemTransfer = 0,
  systemCard = 0,
  notes,
}: {
  shiftName: string;
  cashierName?: string;
  openedAt: number;
  closedAt: number;
  openingCash: number;
  countedCash: number;
  countedTransfer: number;
  countedCard: number;
  cashIn?: number;
  cashOut?: number;
  systemCash?: number;
  systemTransfer?: number;
  systemCard?: number;
  notes?: string;
}): string {
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

  const expectedCash = openingCash + systemCash + cashIn - cashOut;
  const cashDiff = countedCash - expectedCash;
  const totalCounted = countedCash + countedTransfer + countedCard;
  const totalSystem = systemCash + systemTransfer + systemCard;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Báo cáo kết ca - ${shiftName}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm 3mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      width: 72mm;
      margin: 0 auto;
      padding: 3mm 0;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .title { font-size: 15px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
    .subtitle { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
    .meta { font-size: 11px; margin-bottom: 4px; }
    .row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 12px; }
    .section-title { font-weight: 800; font-size: 12px; text-transform: uppercase; margin: 6px 0 2px; background: #f0f0f0; padding: 2px 4px; }
    .diff-match { color: #000; font-weight: 700; }
    .diff-short { color: #000; font-weight: 700; }
    .diff-over { color: #000; font-weight: 700; }
    .sig-area { display: flex; justify-content: space-between; margin-top: 18px; text-align: center; font-size: 11px; }
    .sig-space { height: 40px; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size: 13px;">${BRAND.name.toUpperCase()}</div>
  <div class="center title">BÁO CÁO KẾT CA (Z-REPORT)</div>
  <div class="center subtitle">${shiftName}</div>
  <div class="center meta">Ngày: ${formatDate(closedAt)}</div>
  <div class="center meta">Từ: ${formatTime(openedAt)} → Đến: ${formatTime(closedAt)}</div>
  ${cashierName ? `<div class="center meta">Thu ngân: <strong>${cashierName}</strong></div>` : ''}

  <div class="double-divider"></div>

  <div class="section-title">1. Quỹ tiền mặt đầu ca</div>
  <div class="row">
    <span>Tiền bàn giao đầu ca:</span>
    <span class="bold">${money(openingCash)}</span>
  </div>

  <div class="section-title">2. Thu / Chi phát sinh trong ca</div>
  <div class="row">
    <span>Nạp thêm quỹ:</span>
    <span class="bold">+${money(cashIn)}</span>
  </div>
  <div class="row">
    <span>Rút chi quỹ:</span>
    <span class="bold">-${money(cashOut)}</span>
  </div>

  <div class="section-title">3. Doanh thu bán hàng hệ thống</div>
  <div class="row">
    <span>Tiền mặt (POS):</span>
    <span>${money(systemCash)}</span>
  </div>
  <div class="row">
    <span>Chuyển khoản VietQR:</span>
    <span>${money(systemTransfer)}</span>
  </div>
  <div class="row">
    <span>Thẻ POS ngân hàng:</span>
    <span>${money(systemCard)}</span>
  </div>
  <div class="row bold" style="border-top: 1px dashed #ccc; margin-top: 2px; padding-top: 2px;">
    <span>Tổng doanh thu ca:</span>
    <span>${money(totalSystem)}</span>
  </div>

  <div class="section-title">4. Tiền thực tế bàn giao</div>
  <div class="row bold">
    <span>Tiền mặt kiểm đếm:</span>
    <span>${money(countedCash)}</span>
  </div>
  <div class="row">
    <span>Tiền mặt lý thuyết:</span>
    <span>${money(expectedCash)}</span>
  </div>
  <div class="row bold">
    <span>Chênh lệch tiền mặt:</span>
    <span>${cashDiff === 0 ? 'Khớp (0 đ)' : (cashDiff > 0 ? `Thừa: +${money(cashDiff)}` : `Thiếu: -${money(Math.abs(cashDiff))}`)}</span>
  </div>
  <div class="row" style="margin-top: 4px;">
    <span>Chuyển khoản xác nhận:</span>
    <span>${money(countedTransfer)}</span>
  </div>
  <div class="row">
    <span>Thẻ ngân hàng xác nhận:</span>
    <span>${money(countedCard)}</span>
  </div>
  <div class="row bold" style="border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-size: 13px;">
    <span>TỔNG THỰC BÀN GIAO:</span>
    <span>${money(totalCounted)}</span>
  </div>

  ${notes ? `
    <div class="divider"></div>
    <div style="font-size: 11px;"><strong>Ghi chú:</strong> ${notes}</div>
  ` : ''}

  <div class="divider"></div>

  <div class="sig-area">
    <div>
      <div><strong>Người bàn giao</strong></div>
      <div class="sig-space"></div>
      <div>${cashierName || 'Thu ngân'}</div>
    </div>
    <div>
      <div><strong>Người nhận ca</strong></div>
      <div class="sig-space"></div>
      <div>(Ký và ghi rõ họ tên)</div>
    </div>
  </div>

  <div style="font-size: 10px; text-align: center; margin-top: 12px; color: #666;">
    In lúc: ${formatTime(Date.now())} · Saigon Indoor Golf Club POS
  </div>
</body>
</html>`;
}
