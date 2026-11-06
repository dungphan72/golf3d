'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Loading, PageTabs } from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { call, errText, type Staff } from './api';
import { LeadDetail } from './LeadDetail';
import {
  AppointmentsScreen,
  CustomersScreen,
  HoldsScreen,
  LeadsScreen,
  OrdersScreen,
  OverviewScreen,
  PoolScreen,
  TasksScreen,
  WorkScreen,
  useLoad,
  type Shared,
} from './Screens';

type Settings = {
  slaMinutes: number;
  holdHours: number;
  pool: {
    claimQuotaPerDay: number;
    recallHours: number;
    autoRecall: boolean;
    intakeMode: 'AUTO' | 'POOL';
  };
  calls: {
    retryHours: number[];
    thinkDays: number;
    interestedHours: number;
    metFollowUpHours: number;
  };
  workHours: { enabled: boolean; days: number[]; start: number; end: number };
  appointments: { requireApproval: boolean };
  afterSales: { enabled: boolean };
  notifyAssignEmail: boolean;
  websiteLeads: 'LEGACY' | 'CRM2';
  zaloLeads: 'LEGACY' | 'CRM2';
  facebookLeads: 'LEGACY' | 'CRM2';
  [k: string]: unknown;
};
type Config = {
  settings: Settings;
  staff: Staff[];
  cron: { value: Record<string, unknown>; updated: number } | null;
  me: string;
  role: string;
};
type Product = {
  code: string;
  name: string;
  listPrice: number;
  limited: number;
  active: number;
  held: number;
};

function ConfigScreen() {
  const { data, error, reload, setError } = useLoad<Config>('/api/crm2/config');
  const products = useLoad<{ products: Product[] }>('/api/crm2/sales?view=products');
  const [s, setS] = useState<Settings | null>(null);
  const [retry, setRetry] = useState('');
  const [msg, setMsg] = useState('');
  const [p, setP] = useState({ code: '', name: '', listPrice: '', limited: false });
  useEffect(() => {
    if (data && !s) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- copy the loaded settings into the editable form once
      setS(data.settings);
      setRetry(data.settings.calls.retryHours.join(', '));
    }
  }, [data, s]);
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!s) return <Loading />;
  const num = (v: string, d: number) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
  const save = async () => {
    setMsg('');
    try {
      const next = {
        ...s,
        calls: {
          ...s.calls,
          retryHours: retry
            .split(/[ ,]+/)
            .map(Number)
            .filter((n) => n > 0)
            .slice(0, 3),
        },
      };
      const r = await call<{ settings: Settings }>('/api/crm2/config', { settings: next });
      setS(r.settings);
      setRetry(r.settings.calls.retryHours.join(', '));
      setMsg('Đã lưu cấu hình');
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <div className="settings-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <h3>Tiếp nhận và chia lead</h3>
      <div className="form-grid">
        <label>
          Hạn liên hệ lần đầu (phút)
          <input
            inputMode="numeric"
            value={s.slaMinutes}
            onChange={(e) => setS({ ...s, slaMinutes: num(e.target.value, s.slaMinutes) })}
          />
        </label>
        <label>
          Chế độ nhận lead mới
          <select
            value={s.pool.intakeMode}
            onChange={(e) =>
              setS({ ...s, pool: { ...s.pool, intakeMode: e.target.value as 'AUTO' | 'POOL' } })
            }
          >
            <option value="AUTO">Tự động chia cho nhân viên</option>
            <option value="POOL">Đưa vào kho số để nhân viên tự nhận</option>
          </select>
        </label>
        <label>
          Lead từ form website (3dgolf.vn)
          <select
            value={s.websiteLeads}
            onChange={(e) => setS({ ...s, websiteLeads: e.target.value as 'LEGACY' | 'CRM2' })}
          >
            <option value="LEGACY">Màn Chăm sóc KH (cũ)</option>
            <option value="CRM2">CRM mới (màn này)</option>
          </select>
          <small>
            Chỉ đổi khi đã có nhân viên làm việc ở CRM mới và bộ lập lịch gọi /api/crm2/cron. Lead
            đã vào bên cũ vẫn ở bên cũ; đổi lại bất cứ lúc nào.
          </small>
        </label>
        <label>
          Tin nhắn Zalo OA
          <select
            value={s.zaloLeads}
            onChange={(e) => setS({ ...s, zaloLeads: e.target.value as 'LEGACY' | 'CRM2' })}
          >
            <option value="LEGACY">Màn Chăm sóc KH (cũ)</option>
            <option value="CRM2">CRM mới (màn này)</option>
          </select>
          <small>
            Khách nhắn Zalo không có số điện thoại: các tin của cùng một khách gộp vào một lead theo
            Zalo ID (ghi trong ghi chú). Nhân viên trả lời trong ứng dụng Zalo OA.
          </small>
        </label>
        <label>
          Lead Facebook / Instagram (Lead Ads)
          <select
            value={s.facebookLeads}
            onChange={(e) => setS({ ...s, facebookLeads: e.target.value as 'LEGACY' | 'CRM2' })}
          >
            <option value="LEGACY">Màn Chăm sóc KH (cũ)</option>
            <option value="CRM2">CRM mới (màn này)</option>
          </select>
          <small>
            Chiến dịch và mã biểu mẫu Facebook ghi trong ghi chú của lead. Mỗi lần khách gửi biểu
            mẫu chỉ tính một lần dù Facebook gửi lại.
          </small>
        </label>
        <label>
          Hạn mức nhận số mỗi ngày
          <input
            inputMode="numeric"
            value={s.pool.claimQuotaPerDay}
            onChange={(e) =>
              setS({
                ...s,
                pool: { ...s.pool, claimQuotaPerDay: num(e.target.value, s.pool.claimQuotaPerDay) },
              })
            }
          />
        </label>
        <label>
          Thu hồi sau (giờ không liên hệ)
          <input
            inputMode="numeric"
            value={s.pool.recallHours}
            onChange={(e) =>
              setS({
                ...s,
                pool: { ...s.pool, recallHours: num(e.target.value, s.pool.recallHours) },
              })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.pool.autoRecall}
            onChange={(e) => setS({ ...s, pool: { ...s.pool, autoRecall: e.target.checked } })}
          />{' '}
          Tự thu hồi lead bị bỏ quên về kho số
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.notifyAssignEmail}
            onChange={(e) => setS({ ...s, notifyAssignEmail: e.target.checked })}
          />{' '}
          Email báo nhân viên khi được chia lead
        </label>
      </div>
      <h3>Kết quả cuộc gọi</h3>
      <div className="form-grid">
        <label>
          Gọi lại khi không nghe máy (giờ, tối đa 3 lần)
          <input value={retry} onChange={(e) => setRetry(e.target.value)} />
        </label>
        <label>
          Khách suy nghĩ thêm (ngày)
          <input
            inputMode="numeric"
            value={s.calls.thinkDays}
            onChange={(e) =>
              setS({
                ...s,
                calls: { ...s.calls, thinkDays: num(e.target.value, s.calls.thinkDays) },
              })
            }
          />
        </label>
        <label>
          Có nhu cầu, tư vấn tiếp (giờ)
          <input
            inputMode="numeric"
            value={s.calls.interestedHours}
            onChange={(e) =>
              setS({
                ...s,
                calls: {
                  ...s.calls,
                  interestedHours: num(e.target.value, s.calls.interestedHours),
                },
              })
            }
          />
        </label>
        <label>
          Bám sát sau khi gặp (giờ)
          <input
            inputMode="numeric"
            value={s.calls.metFollowUpHours}
            onChange={(e) =>
              setS({
                ...s,
                calls: {
                  ...s.calls,
                  metFollowUpHours: num(e.target.value, s.calls.metFollowUpHours),
                },
              })
            }
          />
        </label>
      </div>
      <h3>Giờ làm việc, lịch hẹn, giữ chỗ</h3>
      <div className="form-grid">
        <label className="check">
          <input
            type="checkbox"
            checked={s.workHours.enabled}
            onChange={(e) =>
              setS({ ...s, workHours: { ...s.workHours, enabled: e.target.checked } })
            }
          />{' '}
          Đồng hồ hạn liên hệ chỉ chạy trong giờ làm việc
        </label>
        <label>
          Bắt đầu (giờ)
          <input
            inputMode="numeric"
            value={Math.round(s.workHours.start / 60)}
            onChange={(e) =>
              setS({ ...s, workHours: { ...s.workHours, start: num(e.target.value, 8) * 60 } })
            }
          />
        </label>
        <label>
          Kết thúc (giờ)
          <input
            inputMode="numeric"
            value={Math.round(s.workHours.end / 60)}
            onChange={(e) =>
              setS({ ...s, workHours: { ...s.workHours, end: num(e.target.value, 18) * 60 } })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.appointments.requireApproval}
            onChange={(e) => setS({ ...s, appointments: { requireApproval: e.target.checked } })}
          />{' '}
          Lịch hẹn của nhân viên cần quản lý duyệt
        </label>
        <label>
          Giờ giữ chỗ mặc định
          <input
            inputMode="numeric"
            value={s.holdHours}
            onChange={(e) => setS({ ...s, holdHours: num(e.target.value, s.holdHours) })}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.afterSales.enabled}
            onChange={(e) =>
              setS({ ...s, afterSales: { ...s.afterSales, enabled: e.target.checked } })
            }
          />{' '}
          Tự tạo việc chăm sóc sau bán (3, 30, 90 ngày)
        </label>
      </div>
      <p className="savebar">
        <button className="primary" onClick={save}>
          Lưu cấu hình
        </button>{' '}
        {msg && <span role="status">{msg}</span>}
      </p>
      <h3>Danh mục dịch vụ và gói</h3>
      <table className="ds-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên</th>
            <th>Giá niêm yết</th>
            <th>Giới hạn 1 khách</th>
            <th>Đang giữ</th>
          </tr>
        </thead>
        <tbody>
          {(products.data?.products ?? []).map((x) => (
            <tr key={x.code}>
              <td>{x.code}</td>
              <td>{x.name}</td>
              <td>{money(x.listPrice)}</td>
              <td>{x.limited ? 'Có' : 'Không'}</td>
              <td>{x.held ? 'Có' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="crm-actions">
        <input
          aria-label="Mã dịch vụ"
          placeholder="Mã (VD: GOI-9H)"
          value={p.code}
          onChange={(e) => setP({ ...p, code: e.target.value })}
        />
        <input
          aria-label="Tên dịch vụ"
          placeholder="Tên dịch vụ"
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
        <input
          aria-label="Giá niêm yết"
          inputMode="numeric"
          placeholder="Giá niêm yết (đồng)"
          value={p.listPrice}
          onChange={(e) => setP({ ...p, listPrice: e.target.value.replace(/\D/g, '') })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={p.limited}
            onChange={(e) => setP({ ...p, limited: e.target.checked })}
          />{' '}
          Chỉ một khách giữ
        </label>
        <button
          className="secondary"
          disabled={!p.code || !p.name}
          onClick={async () => {
            try {
              await call('/api/crm2/sales', {
                action: 'product',
                code: p.code,
                name: p.name,
                listPrice: Number(p.listPrice) || 0,
                limited: p.limited,
                active: true,
              });
              setP({ code: '', name: '', listPrice: '', limited: false });
              await products.reload();
              await reload();
            } catch (e) {
              setError(errText(e));
            }
          }}
        >
          Lưu dịch vụ
        </button>
      </div>
    </div>
  );
}

export function CrmModule({
  permissions,
  legacy = null,
  initialTab = 'overview',
}: {
  permissions: string[];
  /** The older "Chăm sóc KH" screens, kept as a tab until their data moves to the crm2 tables. */
  legacy?: ReactNode;
  initialTab?: string;
}) {
  const manager = permissions.includes('crm.manage');
  const [tab, setTab] = useState(initialTab);
  const [lead, setLead] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [clock, setClock] = useState(0);
  const cfg = useLoad<Config>('/api/crm2/config', 120_000);
  useEffect(() => {
    setClock(Date.now());
    const t = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!clock || !cfg.data)
    return cfg.error ? (
      <div className="error-box" role="alert">
        {cfg.error}
      </div>
    ) : (
      <Loading />
    );
  const shared: Shared = {
    now: clock,
    me: cfg.data.me,
    manager,
    staff: cfg.data.staff,
    open: setLead,
  };
  if (lead)
    return (
      <section className="crm-panel" aria-label="CRM">
        <LeadDetail
          id={lead}
          now={clock}
          me={cfg.data.me}
          manager={manager}
          staff={cfg.data.staff}
          onClose={() => {
            setLead(null);
            setBump((b) => b + 1);
          }}
          onChanged={() => setBump((b) => b + 1)}
        />
      </section>
    );
  return (
    <section className="crm-panel" aria-label="CRM">
      <PageTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Tổng quan' },
          { key: 'work', label: 'Bàn làm việc' },
          { key: 'pool', label: 'Kho số' },
          { key: 'leads', label: 'Danh sách lead' },
          { key: 'pipeline', label: 'Pipeline' },
          { key: 'tasks', label: 'Việc của tôi' },
          { key: 'appointments', label: 'Lịch hẹn' },
          { key: 'customers', label: 'Khách hàng' },
          { key: 'holds', label: 'Giữ chỗ' },
          { key: 'orders', label: 'Đơn bán' },
          { key: 'config', label: 'Cấu hình', hidden: !manager },
          { key: 'legacy', label: 'Chăm sóc KH (cũ)', hidden: !legacy },
        ]}
      />
      <div key={`${tab}-${bump}`}>
        {tab === 'overview' && <OverviewScreen cron={cfg.data.cron} manager={manager} />}
        {tab === 'work' && <WorkScreen s={shared} />}
        {tab === 'pool' && <PoolScreen s={shared} />}
        {tab === 'leads' && <LeadsScreen s={shared} board={false} />}
        {tab === 'pipeline' && <LeadsScreen s={shared} board />}
        {tab === 'tasks' && <TasksScreen s={shared} />}
        {tab === 'appointments' && <AppointmentsScreen s={shared} />}
        {tab === 'customers' && <CustomersScreen />}
        {tab === 'holds' && <HoldsScreen s={shared} />}
        {tab === 'orders' && <OrdersScreen s={shared} />}
        {tab === 'config' && manager && <ConfigScreen />}
        {tab === 'legacy' && legacy}
      </div>
    </section>
  );
}
