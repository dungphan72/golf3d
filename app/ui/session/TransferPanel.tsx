'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { money, type Booking } from '../../../lib/club';
import { paymentCode, SEPAY_BANKS, sepayQrUrl, vietQrUrl } from '../../../lib/bank';
import { time } from '../shared';

export type Bank = { bin: string; account: string; holder: string };

export function TransferPanel({
  booking,
  bank,
  fallbackAmount,
  busy,
  onUse,
}: {
  booking: Booking;
  bank: Bank;
  fallbackAmount?: number;
  busy: boolean;
  onUse: (txId: string) => void;
}) {
  type Overview = {
    configured: boolean;
    code: string;
    due: number | null;
    transactions: { id: string; amount: number; tx_time: number }[];
  };
  const [data, setData] = useState<Overview | null>(null);
  const [useFallbackQr, setUseFallbackQr] = useState(false);
  const [copiedField, setCopiedField] = useState<'account' | 'code' | null>(null);

  const load = async () => {
    try {
      const r = await fetch('/api/bank?booking=' + encodeURIComponent(booking.id), {
        cache: 'no-store',
      });
      if (r.ok) {
        const v = (await r.json()) as Overview;
        setData(v);
      }
    } catch {
      /* ignore network hiccup during polling */
    }
  };

  useEffect(() => {
    let live = true;
    const poll = () => {
      if (live) load();
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      live = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  // Never guess where the customer's money goes: without a configured account there is no QR.
  const effectiveBin = bank.bin;
  const effectiveAccount = bank.account;
  const effectiveHolder = bank.holder;
  const bankConfigured = !!bank.bin && !!bank.account;
  const effectiveAmount = data?.due ?? fallbackAmount ?? booking.amount ?? 0;
  const effectiveCode = data?.code || paymentCode(booking.id);
  const bankInfo = SEPAY_BANKS.find((b) => b.bin === effectiveBin);

  const primaryQr = sepayQrUrl({
    bin: effectiveBin,
    account: effectiveAccount,
    holder: effectiveHolder,
    amount: effectiveAmount,
    note: effectiveCode,
  });
  const backupQr = vietQrUrl({
    bin: effectiveBin,
    account: effectiveAccount,
    holder: effectiveHolder,
    amount: effectiveAmount,
    note: effectiveCode,
  });

  const txs = data?.transactions ?? [];
  const exact = txs.filter((t) => t.amount === effectiveAmount);
  const other = txs.filter((t) => t.amount !== effectiveAmount);

  function copyText(val: string, field: 'account' | 'code') {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  }

  if (!bankConfigured)
    return (
      <div className="info-strip transfer-panel" role="alert">
        Chưa cấu hình tài khoản nhận tiền. Vào Cài đặt hệ thống › Thanh toán để nhập ngân hàng, số
        tài khoản và tên chủ tài khoản trước khi thu chuyển khoản.
      </div>
    );

  return (
    <div
      className="info-strip transfer-panel"
      style={{
        padding: '16px',
        borderRadius: 5,
        background: '#f8fafc',
        border: exact.length > 0 ? '2px solid #16a34a' : '1px solid #cbd5e1',
      }}
    >
      {/* SePay Gateway Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              background: '#059669',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Zap size={12} /> SePay Gateway
          </span>
          <a
            href="https://my.sepay.vn"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              color: '#047857',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            my.sepay.vn <ExternalLink size={11} />
          </a>
        </div>

        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: 999,
            background: exact.length > 0 ? '#dcfce7' : data?.configured ? '#e0f2fe' : '#fef3c7',
            color: exact.length > 0 ? '#15803d' : data?.configured ? '#0369a1' : '#92400e',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {exact.length > 0 ? (
            <>
              <CheckCircle2 size={13} /> Đã nhận báo có SePay!
            </>
          ) : data?.configured ? (
            <>
              <RefreshCw size={12} className="ar-spin" /> Đang chờ báo có tự động...
            </>
          ) : (
            <>
              <ShieldCheck size={13} /> QR Động SePay sẵn sàng
            </>
          )}
        </span>
      </div>

      {/* Main QR + Account Details: one column, QR on top, one fact per row */}
      <div className="pos-m3-tp">
        <div className="pos-m3-tp-qr">
          <img
            alt="Mã QR Cổng thanh toán SePay"
            width={220}
            height={220}
            src={useFallbackQr ? backupQr : primaryQr}
            onError={() => {
              if (!useFallbackQr) setUseFallbackQr(true);
            }}
          />
          <small>Quét bằng ứng dụng ngân hàng hoặc ví điện tử</small>
        </div>

        <dl className="pos-m3-tp-info">
          <div>
            <dt>Ngân hàng thụ hưởng</dt>
            <dd>{bankInfo ? `${bankInfo.code} - ${bankInfo.name}` : `BIN ${effectiveBin}`}</dd>
          </div>
          <div>
            <dt>Số tài khoản</dt>
            <dd>
              <code>{effectiveAccount}</code>
              <button
                type="button"
                onClick={() => copyText(effectiveAccount, 'account')}
                title="Sao chép số tài khoản"
                aria-label="Sao chép số tài khoản"
              >
                {copiedField === 'account' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </dd>
          </div>
          <div>
            <dt>Chủ tài khoản</dt>
            <dd>{effectiveHolder}</dd>
          </div>
          <div className="amount">
            <dt>Số tiền thanh toán</dt>
            <dd>{money(effectiveAmount)}</dd>
          </div>
          <div>
            <dt>
              Nội dung chuyển khoản
              <small>Nhập đúng nội dung để hệ thống tự khớp đơn</small>
            </dt>
            <dd>
              <code className="code">{effectiveCode}</code>
              <button
                type="button"
                onClick={() => copyText(effectiveCode, 'code')}
                title="Sao chép nội dung chuyển khoản"
                aria-label="Sao chép nội dung chuyển khoản"
              >
                {copiedField === 'code' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </dd>
          </div>
        </dl>
      </div>

      {/* Matched SePay Webhook Transactions */}
      {exact.map((t) => (
        <div
          key={t.id}
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 5,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ color: '#166534', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> SePay đã báo có {money(t.amount)} lúc {time(t.tx_time)}
            </span>
          </div>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => onUse(t.id)}
            style={{
              width: '100%',
              height: 40,
              fontSize: 14,
              fontWeight: 700,
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            ✓ Xác nhận thanh toán SePay ({money(t.amount)})
          </button>
        </div>
      ))}

      {other.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            color: '#b45309',
            background: '#fef3c7',
            padding: '8px 12px',
            borderRadius: 5,
            fontSize: 12.5,
            marginTop: 8,
          }}
        >
          ⚠ Nhận giao dịch lệch số tiền: <strong>{money(t.amount)}</strong> (Cần thu: {money(effectiveAmount)})
        </div>
      ))}

      {/* Action Footer when waiting for transfer */}
      {exact.length === 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => onUse('')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 5,
              border: 'none',
              background: '#059669',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check size={15} /> Xác nhận đã nhận QR
          </button>
        </div>
      )}
    </div>
  );
}
