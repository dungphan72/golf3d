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
    <div className="info-strip transfer-panel">
      <p>
        <strong>Chuyển khoản {money(data.due)}</strong> · nội dung: <code>{data.code}</code>
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Mã QR chuyển khoản"
        width={220}
        height={220}
        src={vietQrUrl({
          bin: bank.bin,
          account: bank.account,
          holder: bank.holder,
          amount: data.due,
          note: data.code,
        })}
      />
      {exact.map((t) => (
        <button key={t.id} className="primary" disabled={busy} onClick={() => onUse(t.id)}>
          Đã nhận {money(t.amount)} lúc {time(t.tx_time)} — xác nhận thanh toán
        </button>
      ))}
      {other.map((t) => (
        <p key={t.id} role="status">
          Có giao dịch {money(t.amount)} nhưng khác số phải thu {money(data.due!)}; hãy kiểm tra
          lại.
        </p>
      ))}
      {data.configured && !data.transactions.length && (
        <p className="muted">Đang chờ ngân hàng báo có… (tự cập nhật)</p>
      )}
    </div>
  );
}
