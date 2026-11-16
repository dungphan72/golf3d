'use client';
import { useEffect, useState } from 'react';
import type { Booking } from '../../../lib/club';

export function PackageRedeem({
  booking,
  money: fmt,
  onChanged,
  mode = 'all',
}: {
  booking: Booking;
  money: (n: number) => string;
  onChanged: () => Promise<void>;
  /** 'wallet' and 'package' show one clear panel each; 'all' keeps the compact combined strip. */
  mode?: 'all' | 'wallet' | 'package';
}) {
  type Usable = {
    packages: {
      id: string;
      name: string;
      remaining: number;
      expires: number;
      customer: string;
      enough: boolean;
    }[];
    covered: number;
    kind?: string;
    units?: number;
    usedUnits?: number;
    wallet?: {
      customer: string;
      balance: number;
      amount: number;
      enough: boolean;
      payable: boolean;
      paid: number;
    } | null;
    /** The member behind the booking's phone number, even with an empty wallet. */
    member?: { name: string; balance: number } | null;
  };
  const [data, setData] = useState<Usable | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    fetch('/api/members?usableFor=' + encodeURIComponent(booking.id), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Usable>) : null))
      .then((v) => live && setData(v))
      .catch(() => undefined)
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [booking.id, booking.status]);
  const wallet = data?.wallet && data.wallet.payable ? data.wallet : null;
  if (mode === 'wallet') return walletPanel();
  if (mode === 'package') return packagePanel();
  if (!data || (!data.packages.length && !data.covered && !wallet)) return null;
  async function redeem(packageId: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', bookingId: booking.id, packageId }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Không trả được bằng gói');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function payWallet() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wallet-pay', bookingId: booking.id }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Không trả được bằng ví');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function walletPanel() {
    if (!loaded) return <div className="pos-m3-wallet">Đang kiểm tra số dư ví…</div>;
    const m = data?.member ?? null;
    if (!m)
      return (
        <div className="pos-m3-wallet bad" role="alert">
          <strong>Không tìm thấy ví của khách này.</strong>
          <span>
            Phiếu cần có số điện thoại trùng với hồ sơ hội viên. Hãy chọn phương thức khác hoặc
            thêm khách vào mục Hội viên.
          </span>
        </div>
      );
    const w = data?.wallet ?? null;
    const amount = w?.amount ?? booking.amount ?? 0;
    const balance = m.balance;
    if (w && w.paid > 0)
      return (
        <div className="pos-m3-wallet ok" role="status">
          <strong>Phiếu này đã được trả bằng ví: {fmt(w.paid)}.</strong>
        </div>
      );
    const mismatch = w ? (booking.amount ?? 0) !== w.amount : false;
    return (
      <div className="pos-m3-wallet">
        <div className="pos-m3-wallet-row">
          <span>Hội viên</span>
          <strong>{m.name}</strong>
        </div>
        <div className="pos-m3-wallet-row">
          <span>Số dư ví</span>
          <strong>{fmt(balance)}</strong>
        </div>
        <div className="pos-m3-wallet-row total">
          <span>Cần thanh toán</span>
          <strong>{fmt(amount)}</strong>
        </div>
        {!w || !w.payable ? (
          <div className="pos-m3-wallet bad" role="alert">
            Phiếu chưa thể trả bằng ví: hãy bấm &ldquo;Kết thúc chơi&rdquo; để chốt tiền trước.
          </div>
        ) : mismatch ? (
          <div className="pos-m3-wallet bad" role="alert">
            Tổng trên màn hình ({fmt(booking.amount ?? 0)}) khác số tiền phiếu ({fmt(w.amount)}). Ví
            chỉ trả đúng số tiền phiếu đã chốt; hãy kiểm tra giảm giá hoặc món chưa chốt, hoặc chọn
            phương thức khác.
          </div>
        ) : amount <= 0 || balance < amount ? (
          <div className="pos-m3-wallet bad" role="alert">
            <strong>Số dư ví không đủ{amount > 0 ? `: thiếu ${fmt(amount - balance)}` : ''}.</strong>
            <span>Nạp thêm ví cho khách hoặc chọn phương thức thanh toán khác.</span>
          </div>
        ) : (
          <>
            <div className="pos-m3-wallet ok" role="status">
              Đủ số dư. Sau thanh toán ví còn {fmt(balance - amount)}.
            </div>
            <button
              type="button"
              className="pos-m3-btn-primary pos-m3-btn-block pos-m3-btn-lg"
              disabled={busy}
              onClick={payWallet}
            >
              {busy ? 'Đang xử lý…' : `Thanh toán bằng ví · ${fmt(amount)}`}
            </button>
          </>
        )}
        {error && (
          <div className="error-box" role="alert" style={{ marginTop: 6 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  function packagePanel() {
    if (!loaded) return <div className="pos-m3-wallet">Đang kiểm tra thẻ giờ…</div>;
    if (data && data.covered > 0)
      return (
        <div className="pos-m3-wallet ok" role="status">
          Đã trừ gói: <strong>{fmt(data.covered)}</strong> · Còn lại:{' '}
          <strong>{fmt((booking.amount ?? 0) - data.covered)}</strong>
        </div>
      );
    if (!data || !data.packages.length)
      return (
        <div className="pos-m3-wallet bad" role="alert">
          <strong>Khách chưa có thẻ giờ khả dụng cho phiên này.</strong>
          <span>Chọn phương thức thanh toán khác hoặc bán gói trong mục Hội viên.</span>
        </div>
      );
    return (
      <div className="pos-m3-wallet">
        <strong>Gói hội viên khả dụng</strong>
        {data.packages.map((p) => (
          <div key={p.id} className="pos-m3-wallet-row">
            <span>
              {p.name} ({p.remaining >= 99999 ? '∞' : `${p.remaining}h`})
              {p.enough ? '' : ' · thiếu giờ cho phiên này'}
            </span>
            <button
              type="button"
              className="pos-m3-btn-tonal"
              disabled={busy || !p.enough}
              onClick={() => redeem(p.id)}
            >
              Dùng gói
            </button>
          </div>
        ))}
        {error && (
          <div className="error-box" role="alert" style={{ marginTop: 6 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="info-strip" style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 5 }}>
      {data.covered > 0 ? (
        <p style={{ margin: 0, fontSize: 13 }}>
          Đã trừ gói: <strong>{fmt(data.covered)}</strong> · Còn lại:{' '}
          <strong style={{ color: 'var(--ds-green-dark)' }}>{fmt((booking.amount ?? 0) - data.covered)}</strong>
        </p>
      ) : (
        <>
          {wallet && (
            <div style={{ marginBottom: data.packages.length ? 8 : 0 }}>
              <button
                className="secondary"
                disabled={busy || !wallet.enough}
                title={wallet.enough ? undefined : 'Số dư ví không đủ cho cả phiếu'}
                onClick={payWallet}
                style={{ height: 32, fontSize: 12.5, padding: '0 10px' }}
              >
                Trả bằng ví ({fmt(wallet.balance)}){wallet.enough ? '' : ' · không đủ'}
              </button>
            </div>
          )}
          {data.packages.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Gói hội viên khả dụng:</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.packages.map((p) => (
              <button
                key={p.id}
                className="secondary"
                disabled={busy || !p.enough}
                title={p.enough ? undefined : 'Gói không đủ giờ cho phiên này'}
                onClick={() => redeem(p.id)}
                style={{ height: 32, fontSize: 12.5, padding: '0 10px' }}
              >
                Dùng gói: {p.name} ({p.remaining >= 99999 ? '∞' : `${p.remaining}h`}){p.enough ? '' : ' · thiếu giờ'}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <div className="error-box" role="alert" style={{ marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
