'use client';
import { useEffect, useState } from 'react';
import { CRM_RULES, type CrmSettings } from '../../../lib/crm';
import { call } from './shared';

export function FlowsView() {
  const [s, setS] = useState<CrmSettings | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    call('/api/crm?view=tasks')
      .then((v) => setS(v.settings as CrmSettings))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (!s) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  return (
    <div className="crm-flows">
      <p className="muted">
        Mỗi quy trình tự sinh việc chăm sóc cho nhân viên khi có sự kiện tương ứng. Chỉnh mẫu tin
        nhắn bằng các biến: {'{ten}'} {'{cs}'} {'{ngay}'} {'{goi}'} {'{han}'} {'{con}'}{' '}
        {'{so_ngay}'} {'{diem}'}.
      </p>
      {CRM_RULES.map((r) => (
        <article key={r.id} className="crm-flow">
          <header>
            <label className="check">
              <input
                type="checkbox"
                checked={s.rules[r.id].enabled}
                onChange={(e) =>
                  setS({
                    ...s,
                    rules: { ...s.rules, [r.id]: { ...s.rules[r.id], enabled: e.target.checked } },
                  })
                }
              />
              <strong>{r.name}</strong>
            </label>
            <small>{r.help}</small>
          </header>
          {r.param && (
            <label>
              {r.param.label}
              <input
                type="number"
                min={r.param.min}
                max={r.param.max}
                value={s.rules[r.id].value}
                onChange={(e) =>
                  setS({
                    ...s,
                    rules: {
                      ...s.rules,
                      [r.id]: { ...s.rules[r.id], value: Number(e.target.value) },
                    },
                  })
                }
              />
            </label>
          )}
          <label>
            Mẫu tin nhắn
            <textarea
              rows={3}
              value={s.templates[r.id]}
              onChange={(e) =>
                setS({ ...s, templates: { ...s.templates, [r.id]: e.target.value } })
              }
            />
          </label>
        </article>
      ))}
      <label>
        Chi tiêu từ (đồng) thì gắn nhóm VIP
        <input
          type="number"
          min={0}
          value={s.vipSpend}
          onChange={(e) => setS({ ...s, vipSpend: Number(e.target.value) })}
        />
      </label>
      {msg && <p role="status">{msg}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button
        className="primary"
        onClick={async () => {
          setError('');
          setMsg('');
          try {
            await call('/api/crm', { action: 'settings-save', settings: s });
            setMsg('Đã lưu quy trình chăm sóc');
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        Lưu quy trình
      </button>
    </div>
  );
}
