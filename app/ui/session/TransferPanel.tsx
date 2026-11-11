'use client';
import { useEffect, useState } from 'react';
import { money, type Booking } from '../../../lib/club';
import { vietQrUrl } from '../../../lib/bank';
import { time } from '../shared';

export type Bank = { bin: string; account: string; holder: string };
export function TransferPanel({
  booking,
  bank,
  busy,
  onUse,
}: {
  booking: Booking;
  bank: Bank;
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
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch('/api/bank?booking=' + encodeURIComponent(booking.id), { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<Overview>) : null))
        .then((v) => live && setData(v));
    load();
    const id = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [booking.id]);
  const hasBank = !!bank.bin && !!bank.account;
  if (!data || !hasBank || data.due == null) return null;
  const exact = data.transactions.filter((t) => t.amount === data.due);
  const other = data.transactions.filter((t) => t.amount !== data.due);
  return (
    <div className="info-strip transfer-panel" style={{ padding: '14px 16px', borderRadius: 8, textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13.5, textAlign: 'center' }}>
        <strong>Chuyển khoản {money(data.due)}</strong> · nội dung: <code>{data.code}</code>
      </p>
      <div style={{ background: '#fff', padding: 10, borderRadius: 8, display: 'inline-block', border: '1px solid #e2e8f0', margin: '4px 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Mã QR chuyển khoản"
          width={190}
          height={190}
          style={{ display: 'block', margin: '0 auto' }}
          src={vietQrUrl({
            bin: bank.bin,
            account: bank.account,
            holder: bank.holder,
            amount: data.due,
            note: data.code,
          })}
        />
        <div style={{ fontSize: 12, color: 'var(--ds-muted)', marginTop: 4 }}>
          Nội dung: <strong style={{ color: 'var(--ds-text)' }}>{data.code}</strong>
        </div>
      </div>
      {exact.map((t) => (
        <button
          key={t.id}
          className="primary"
          disabled={busy}
          onClick={() => onUse(t.id)}
          style={{ width: '100%', marginTop: 8, height: 38, fontSize: 13.5 }}
        >
          Khớp {money(t.amount)} lúc {time(t.tx_time)} · Xác nhận
        </button>
      ))}
      {other.map((t) => (
        <div key={t.id} role="status" style={{ color: '#b45309', fontSize: 12.5, marginTop: 6 }}>
          Lệch tiền: {money(t.amount)} (cần {money(data.due!)})
        </div>
      ))}
      {data.configured && !data.transactions.length && (
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
          Chờ giao dịch ngân hàng...
        </p>
      )}
    </div>
  );
}
