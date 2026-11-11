'use client';
import { useState } from 'react';
import { money } from '../../lib/club';
import { WALLET_TIERS, WALLET_MIN_TOPUP, walletBonus } from '../../lib/wallet';

export type WalletEntry = {
  id: string;
  delta: number;
  reason: string;
  note: string;
  created: number;
};
const REASON: Record<string, string> = {
  topup: 'Nạp tiền',
  bonus: 'Tiền tặng',
  spend: 'Thanh toán phiếu',
  adjust: 'Điều chỉnh',
};
const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Customer wallet at the counter: balance, top-up with the bonus tiers, and the latest movements. */
export function WalletPanel({
  balance,
  history,
  canTopUp,
  busy,
  onTopUp,
}: {
  balance: number;
  history: WalletEntry[];
  canTopUp: boolean;
  busy: boolean;
  onTopUp: (amount: number, method: 'cash' | 'transfer' | 'card') => void;
}) {
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [custom, setCustom] = useState('');
  const customAmount = Number(custom.replace(/\D/g, '')) || 0;
  const customOk = customAmount >= WALLET_MIN_TOPUP && customAmount <= 100_000_000;
  return (
    <section className="member-wallet" aria-label="Ví hội viên" style={{ margin: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Ví tiền</h3>
        <strong style={{ fontSize: 22 }} data-testid="wallet-balance">
          {money(balance)}
        </strong>
      </div>
      {canTopUp && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {WALLET_TIERS.map((t) => (
              <button
                key={t.amount}
                type="button"
                disabled={busy}
                onClick={() => onTopUp(t.amount, method)}
                style={{ height: 38, padding: '0 14px' }}
              >
                Nạp {money(t.amount)} · tặng {money(t.bonus)}
              </button>
            ))}
            <select
              aria-label="Hình thức thu"
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              style={{ height: 38 }}
            >
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="card">Quẹt thẻ</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              aria-label="Số tiền nạp khác"
              inputMode="numeric"
              placeholder="Số tiền khác (từ 100.000đ)"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              style={{ height: 38, width: 220 }}
            />
            <button
              type="button"
              className="secondary"
              disabled={busy || !customOk}
              onClick={() => {
                onTopUp(customAmount, method);
                setCustom('');
              }}
              style={{ height: 38 }}
            >
              Nạp{customOk ? ` ${money(customAmount)}` : ''}
              {customOk && walletBonus(customAmount) ? ` · tặng ${money(walletBonus(customAmount))}` : ''}
            </button>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', fontSize: 13 }}>
          {history.slice(0, 8).map((h) => (
            <li
              key={h.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}
            >
              <span>
                {when(h.created)} · {REASON[h.reason] ?? h.reason}
              </span>
              <strong style={{ color: h.delta < 0 ? '#b91c1c' : '#047857' }}>
                {h.delta < 0 ? '−' : '+'}
                {money(Math.abs(h.delta))}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
