'use client';
import { useEffect, useState } from 'react';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { KIND_LABELS, UNLIMITED, type Grant, type GrantKind } from '../../lib/member';
import { PackageEditor } from './PackageEditor';

type Customer = {
  id: string;
  name: string;
  phone: string;
  note: string;
  points: number;
  account: number | null; // null = no web account, 0 = waiting for staff, 1 = verified
  orders?: number;
};
type PackageType = {
  id: string;
  name: string;
  price: number;
  grants: string;
  valid_days: number;
  perks: string;
  section?: string;
  room?: string;
  active: number;
};
type OwnedPackage = {
  id: string;
  name: string;
  source: string;
  price_paid: number;
  perks: string;
  purchased: number;
  expires: number;
  balances: string | null;
};
type Overview = {
  customers: Customer[];
  types: PackageType[];
  detail: {
    customerId: string;
    packages: OwnedPackage[];
    orders?: { id: string; type_id: string; name: string; price: number; created: number }[];
  } | null;
};

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string; replayed?: boolean };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}
const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const grantsText = (json: string) =>
  (JSON.parse(json) as Grant[])
    .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
    .join(' + ');

export function MembersPanel({ permissions }: { permissions: string[] }) {
  const canSell = permissions.includes('member.sell');
  const canAdjust = permissions.includes('member.adjust');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [typeId, setTypeId] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
  const [saleKey, setSaleKey] = useState(operationKey());
  const [orderId, setOrderId] = useState('');
  const [now] = useState(() => Date.now());

  async function load(q = query, customer = selected) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (customer) params.set('customer', customer);
    const r = await fetch('/api/members?' + params.toString(), { cache: 'no-store' });
    const v = (await r.json()) as Overview & { error?: string };
    if (!r.ok) setError(v.error || 'Không tải được hội viên');
    else {
      setData(v);
      setError('');
    }
  }
  useEffect(() => {
    const id = setTimeout(() => load(query, selected), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  async function act(task: () => Promise<{ replayed?: boolean }>, done: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await task();
      setNotice(result.replayed ? 'Đã ghi nhận trước đó; không ghi trùng.' : done);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const [editing, setEditing] = useState<PackageType | 'new' | null>(null);
  const current = data?.customers.find((c) => c.id === selected) ?? null;
  const activeTypes = data?.types.filter((t) => t.active) ?? [];
  return (
    <section className="members-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="members-grid">
        <div>
          <input
            type="search"
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="customer-list">
            {data?.customers.map((c) => (
              <li key={c.id}>
                <button
                  className={c.id === selected ? 'selected' : ''}
                  onClick={() => setSelected(c.id)}
                >
                  <strong>{c.name}</strong> · {c.phone} · {c.points} điểm
                  {c.account === 0 && <b> · chờ xác nhận tài khoản</b>}
                  {!!c.orders && <b> · yêu cầu mua gói</b>}
                </button>
              </li>
            ))}
            {data && !data.customers.length && <li>Chưa có khách phù hợp</li>}
          </ul>
          {canSell && (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const result = await post({ action: 'customer-create', name, phone, note: '' });
                  setName('');
                  setPhone('');
                  return result;
                }, 'Đã thêm khách hàng');
              }}
            >
              <h3 className="form-label">Thêm khách hàng</h3>
              <label>
                Họ tên
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <button className="primary" disabled={busy}>
                Thêm
              </button>
            </form>
          )}
        </div>
        <div>
          {current ? (
            <>
              <h2>
                {current.name} · {current.phone}
              </h2>
              <p>
                Điểm tích lũy: <strong>{current.points}</strong> (10 điểm = 1 lượt chơi miễn phí)
              </p>
              {current.account != null && (
                <p>
                  Tài khoản web:{' '}
                  <strong>{current.account ? 'đã xác nhận' : 'chờ xác nhận số điện thoại'}</strong>
                  {!current.account && canSell && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Chỉ xác nhận khi người đăng ký đúng là chủ số điện thoại này (đã gặp hoặc gọi lại). Xác nhận?',
                          )
                        )
                          return;
                        act(
                          () => post({ action: 'account-verify', customerId: current.id }),
                          'Đã xác nhận tài khoản web',
                        );
                      }}
                    >
                      Xác nhận
                    </button>
                  )}
                  {canAdjust && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          const r = (await post({
                            action: 'account-reset',
                            customerId: current.id,
                          })) as { password?: string; replayed?: boolean };
                          window.alert(
                            `Mật khẩu tạm: ${r.password}
Đưa cho hội viên; họ đổi lại trong trang tài khoản.`,
                          );
                          return r;
                        }, 'Đã đặt lại mật khẩu')
                      }
                    >
                      Đặt lại mật khẩu
                    </button>
                  )}
                </p>
              )}
              {canSell && current.points >= 10 && (
                <p>
                  Đổi 10 điểm:{' '}
                  {(['9', '18'] as const).map((svc) => (
                    <button
                      key={svc}
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        act(
                          () =>
                            post({
                              action: 'points-redeem',
                              requestId: operationKey(),
                              customerId: current.id,
                              service: svc,
                            }),
                          'Đã đổi điểm lấy lượt miễn phí',
                        )
                      }
                    >
                      1 lượt {svc} hố
                    </button>
                  ))}
                </p>
              )}
              {!!data?.detail?.orders?.length && (
                <>
                  <h3>Yêu cầu mua gói từ hội viên</h3>
                  <ul>
                    {data.detail.orders.map((o) => (
                      <li key={o.id}>
                        <strong>{o.name}</strong> · {money(o.price)} · {day(o.created)}
                        {canSell && (
                          <>
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() => {
                                setTypeId(o.type_id);
                                setOrderId(o.id);
                                setNotice(
                                  'Đã chọn gói theo yêu cầu. Chọn hình thức thu tiền và bấm "Bán gói" bên dưới.',
                                );
                              }}
                            >
                              Bán gói này
                            </button>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () => post({ action: 'order-reject', id: o.id }),
                                  'Đã từ chối yêu cầu mua gói',
                                )
                              }
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h3>Gói đang có</h3>
              <ul>
                {data?.detail?.packages.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong> · hạn {day(p.expires)}
                    {p.expires < now ? ' (đã hết hạn)' : ''} ·{' '}
                    {(JSON.parse(p.balances ?? '[]') as { kind: GrantKind; remaining: number }[])
                      .map(
                        (b) =>
                          `${b.remaining >= UNLIMITED ? 'không giới hạn' : b.remaining} ${KIND_LABELS[b.kind]}`,
                      )
                      .join(', ')}
                    {canAdjust && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => {
                          const note = window.prompt('Lý do điều chỉnh (ít nhất 3 ký tự):');
                          const delta = Number(window.prompt('Số lượt cộng (+) hoặc trừ (-):'));
                          const kind = window.prompt('Loại: holes9, holes18 hoặc gdr', 'holes18');
                          if (!note || !Number.isInteger(delta) || !delta || !kind) return;
                          act(
                            () =>
                              post({
                                action: 'adjust',
                                requestId: operationKey(),
                                packageId: p.id,
                                kind,
                                delta,
                                note,
                              }),
                            'Đã điều chỉnh số lượt',
                          );
                        }}
                      >
                        Điều chỉnh
                      </button>
                    )}
                  </li>
                ))}
                {data?.detail && !data.detail.packages.length && <li>Chưa mua gói nào</li>}
              </ul>
              {canSell && (
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const result = await post({
                        action: 'sell',
                        requestId: saleKey,
                        customerId: current.id,
                        typeId,
                        method,
                        ...(orderId ? { orderId } : {}),
                      });
                      setOrderId('');
                      setSaleKey(operationKey());
                      return result;
                    }, 'Đã bán gói và ghi vào sổ ca');
                  }}
                >
                  <h3 className="form-label">Bán gói (cần mở ca)</h3>
                  <label>
                    Gói
                    <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
                      <option value="">— Chọn gói —</option>
                      {activeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {money(t.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hình thức thu
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as typeof method)}
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản đã đối soát</option>
                      <option value="card">Thẻ tại quầy</option>
                    </select>
                  </label>
                  <button className="primary" disabled={busy || !typeId}>
                    Xác nhận đã nhận tiền
                  </button>
                </form>
              )}
            </>
          ) : (
            <p>Chọn một khách hàng để xem gói và điểm.</p>
          )}
        </div>
      </div>
      <h2>Danh mục gói</h2>
      {canAdjust && (
        <p className="form-note">
          Giá và quyền lợi ở đây hiện trực tiếp trên trang <a href="/bang-gia">/bang-gia</a> và
          trang chủ. Giá theo giờ, theo lượt sửa ở Cài đặt cơ sở → bảng giá.
        </p>
      )}
      {canAdjust && editing && (
        <PackageEditor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(body) =>
            act(
              () => post({ action: 'type-save', requestId: operationKey(), ...body }),
              body.id ? 'Đã lưu gói' : 'Đã thêm gói',
            ).then(() => setEditing(null))
          }
        />
      )}
      {canAdjust && !editing && (
        <button className="secondary" disabled={busy} onClick={() => setEditing('new')}>
          Thêm gói
        </button>
      )}
      {canAdjust && data && !data.types.length && (
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            act(
              () => post({ action: 'types-seed' }),
              'Đã nạp danh mục gói theo bảng giá chính thức',
            )
          }
        >
          Nạp danh mục theo bảng giá chính thức
        </button>
      )}
      <table>
        <thead>
          <tr>
            <th>Gói</th>
            <th>Giá</th>
            <th>Quyền lợi</th>
            <th>Phòng</th>
            <th>Hiệu lực</th>
            <th>Trạng thái</th>
            {canAdjust && <th></th>}
          </tr>
        </thead>
        <tbody>
          {data?.types.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{money(t.price)}</td>
              <td>
                {grantsText(t.grants)}
                {t.perks ? ` · ${t.perks}` : ''}
              </td>
              <td>{t.room === 'standard' ? 'Tiêu chuẩn' : t.room === 'vip' ? 'VIP' : 'Tất cả'}</td>
              <td>{t.valid_days} ngày</td>
              <td>{t.active ? 'Đang bán' : 'Ngừng bán'}</td>
              {canAdjust && (
                <td>
                  <button disabled={busy} onClick={() => setEditing(t)}>
                    Sửa
                  </button>{' '}
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () =>
                          post({
                            action: 'type-save',
                            id: t.id,
                            requestId: operationKey(),
                            name: t.name,
                            price: t.price,
                            grants: JSON.parse(t.grants),
                            validDays: t.valid_days,
                            perks: t.perks,
                            section: t.section ?? '',
                            room: t.room ?? 'any',
                            active: !t.active,
                          }),
                        'Đã cập nhật gói',
                      )
                    }
                  >
                    {t.active ? 'Ngừng bán' : 'Bán lại'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
