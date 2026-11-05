'use client';
import { useState } from 'react';
import { GRANT_KINDS, KIND_LABELS, UNLIMITED, type Grant, type GrantKind } from '../../lib/member';

export type EditablePackage = {
  id: string;
  name: string;
  price: number;
  grants: string;
  valid_days: number;
  perks: string;
  active: number;
};

type GrantState = Record<GrantKind, { on: boolean; qty: string; unlimited: boolean }>;

function startGrants(json?: string): GrantState {
  const list: Grant[] = json ? (JSON.parse(json) as Grant[]) : [];
  const state = {} as GrantState;
  for (const kind of GRANT_KINDS) {
    const found = list.find((g) => g.kind === kind);
    state[kind] = {
      on: !!found,
      qty: found && found.qty < UNLIMITED ? String(found.qty) : '',
      unlimited: !!found && found.qty >= UNLIMITED,
    };
  }
  return state;
}

/** Create or edit a package. The public price page reads this catalogue, so a save here updates the website. */
export function PackageEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: EditablePackage | null;
  busy: boolean;
  onSave: (body: {
    id?: string;
    name: string;
    price: number;
    grants: Grant[];
    validDays: number;
    perks: string;
    active: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [days, setDays] = useState(initial ? String(initial.valid_days) : '90');
  const [perks, setPerks] = useState(initial?.perks ?? '');
  const [active, setActive] = useState(initial ? !!initial.active : true);
  const [grants, setGrants] = useState<GrantState>(() => startGrants(initial?.grants));
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const list: Grant[] = [];
    for (const kind of GRANT_KINDS) {
      const g = grants[kind];
      if (!g.on) continue;
      const qty = g.unlimited ? UNLIMITED : Math.round(Number(g.qty));
      if (!Number.isFinite(qty) || qty < 1)
        return setError(`Nhập số ${KIND_LABELS[kind]} (từ 1 trở lên)`);
      list.push({ kind, qty });
    }
    if (!list.length)
      return setError('Chọn ít nhất một quyền lợi (lượt 9 hố, 18 hố hoặc buổi GDR)');
    const cost = Math.round(Number(price));
    if (!Number.isFinite(cost) || cost < 1) return setError('Giá phải lớn hơn 0');
    const validDays = Math.round(Number(days));
    if (!Number.isFinite(validDays) || validDays < 1) return setError('Hiệu lực tối thiểu 1 ngày');
    if (name.trim().length < 2) return setError('Nhập tên gói');
    setError('');
    onSave({
      ...(initial ? { id: initial.id } : {}),
      name: name.trim(),
      price: cost,
      grants: list,
      validDays,
      perks: perks.trim(),
      active,
    });
  }

  return (
    <form className="package-editor info-strip" onSubmit={submit}>
      <h3 className="form-label">{initial ? 'Sửa gói' : 'Thêm gói mới'}</h3>
      <div className="form-grid">
        <label>
          Tên gói
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Giá bán (đồng, chưa gồm VAT)
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>
        <label>
          Hiệu lực (ngày)
          <input
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>
        <label>
          Quyền lợi thêm (cách nhau bằng dấu “·”)
          <input
            value={perks}
            maxLength={300}
            placeholder="Ví dụ: Phòng chờ VIP · Giảm 20% F&B"
            onChange={(e) => setPerks(e.target.value)}
          />
        </label>
      </div>
      <fieldset>
        <legend>Số lượt trong gói</legend>
        {GRANT_KINDS.map((kind) => (
          <div key={kind} className="grant-row">
            <label>
              <input
                type="checkbox"
                checked={grants[kind].on}
                onChange={(e) =>
                  setGrants({ ...grants, [kind]: { ...grants[kind], on: e.target.checked } })
                }
              />
              {KIND_LABELS[kind]}
            </label>
            {grants[kind].on && (
              <>
                <input
                  aria-label={`Số ${KIND_LABELS[kind]}`}
                  inputMode="numeric"
                  disabled={grants[kind].unlimited}
                  value={grants[kind].qty}
                  onChange={(e) =>
                    setGrants({
                      ...grants,
                      [kind]: { ...grants[kind], qty: e.target.value.replace(/\D/g, '') },
                    })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={grants[kind].unlimited}
                    onChange={(e) =>
                      setGrants({
                        ...grants,
                        [kind]: { ...grants[kind], unlimited: e.target.checked },
                      })
                    }
                  />
                  Không giới hạn
                </label>
              </>
            )}
          </div>
        ))}
      </fieldset>
      <label className="check-row">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Đang bán (hiện trên trang bảng giá)
      </label>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="form-footer">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
          Hủy
        </button>
        <button className="primary" disabled={busy}>
          {initial ? 'Lưu thay đổi' : 'Thêm gói'}
        </button>
      </div>
    </form>
  );
}
