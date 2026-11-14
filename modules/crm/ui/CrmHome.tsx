'use client';
import { ArrowRight, CalendarDays, Check, CircleDollarSign, Handshake, Phone, Target, TrendingUp, UserPlus, Users } from 'lucide-react';
import { money } from '../../../lib/club';
import { Loading } from '../../../app/ui/kit';
import { STAGE_LABELS, type Stage } from '../core/stages';
import { useLoad } from './Screens';

type Home = {
  kpi: {
    customers: number;
    customersDelta: number | null;
    leadsMonth: number;
    leadsDelta: number | null;
    openDeals: number;
    openValue: number;
    revenueMonth: number | null;
    todayTasks: number;
    apptToday: number;
  };
  columns: { key: string; label: string; count: number; value: number; cards: { id: string; name: string; note: string; value: number }[] }[];
  weekly: { label: string; revenue: number }[];
  activity: { id: string; type: string; text: string; lead: string; at: number }[];
  recent: { id: string; name: string; phone: string; email: string; stage: string; value: number; owner: string; updated: number }[];
  tasks: { id: string; title: string; due: number | null; done: boolean }[];
};

const hhmm = (t: number | null) => (t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }) : '');
const ago = (t: number, now: number) => {
  const m = Math.max(0, Math.round((now - t) / 60_000));
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
};
const delta = (v: number | null) =>
  v === null ? <small className="muted">Chưa có số liệu kỳ trước</small> : <small className={v >= 0 ? 'up' : 'down'}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}% so với tháng trước</small>;

/** Dashboard of the CRM home screen: KPIs, pipeline in 5 columns, weekly revenue, activity, recent leads and today's tasks. */
export function CrmHome({ onLead, onPage }: { onLead: (id: string) => void; onPage: (p: 'leads' | 'pipeline' | 'care' | 'appointments' | 'customers') => void }) {
  const { data, error } = useLoad<Home & { now?: number }>('/api/crm2/home', 60_000);
  if (error && !data) return <p className="crm-home-err">{error}</p>;
  if (!data) return <Loading />;
  const now = data.now ?? 0;
  const k = data.kpi;
  const dealsTotal = data.columns.reduce((s, c) => s + c.count, 0);
  const dealsValue = data.columns.reduce((s, c) => s + c.value, 0);
  const max = Math.max(1, ...data.weekly.map((w) => w.revenue));

  const kpis = [
    { icon: Users, tone: 'blue', label: 'Khách hàng', value: k.customers.toLocaleString('vi-VN'), foot: delta(k.customersDelta) },
    { icon: Target, tone: 'green', label: 'Lead mới (tháng)', value: k.leadsMonth.toLocaleString('vi-VN'), foot: delta(k.leadsDelta) },
    { icon: Handshake, tone: 'amber', label: 'Cơ hội đang theo dõi', value: k.openDeals.toLocaleString('vi-VN'), foot: <small className="muted">Giá trị {money(k.openValue)}</small> },
    ...(k.revenueMonth !== null ? [{ icon: CircleDollarSign, tone: 'violet', label: 'Doanh thu tháng', value: money(k.revenueMonth), foot: <small className="muted">Đã trừ hoàn tiền</small> }] : []),
    { icon: CalendarDays, tone: 'sky', label: 'Lịch hôm nay', value: `${k.todayTasks + k.apptToday} công việc`, foot: <small className="muted">{k.apptToday} cuộc hẹn • {k.todayTasks} chăm sóc</small> },
  ];

  return (
    <div className="crm-home">
      <section className="crm-home-kpis" aria-label="Chỉ số chính">
        {kpis.map(({ icon: Icon, tone, label, value, foot }) => (
          <article key={label} className="crm-kpi">
            <span className={'crm-kpi-ic ' + tone}><Icon size={26} /></span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
              {foot}
            </div>
          </article>
        ))}
      </section>

      <div className="crm-home-grid">
        <section className="crm-card crm-pipe">
          <header>
            <h3><TrendingUp size={20} /> Pipeline bán hàng</h3>
            <p>Tổng: <b>{dealsTotal} cơ hội</b> <span>Giá trị: <b>{money(dealsValue)}</b></span></p>
            <button type="button" onClick={() => onPage('pipeline')}>Xem chi tiết <ArrowRight size={14} /></button>
          </header>
          <div className="crm-pipe-cols">
            {data.columns.map((col, i) => (
              <div key={col.key} className={'crm-pipe-col t' + i}>
                <div className="crm-pipe-head">
                  <b>{col.label}</b>
                  <small>{col.count} cơ hội{i === 4 ? ` • ${money(col.value)}` : ''}</small>
                </div>
                {col.cards.length === 0 && <p className="crm-pipe-empty">Chưa có</p>}
                {col.cards.map((card) => (
                  <button key={card.id} type="button" className="crm-pipe-card" onClick={() => onLead(card.id)}>
                    <b>{card.name}</b>
                    <small>{card.note || '—'}</small>
                    <span>{money(card.value)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="crm-card crm-chart">
          <header><h3>Hiệu quả kinh doanh</h3><small>Doanh thu theo tuần của tháng này</small></header>
          {k.revenueMonth === null ? (
            <p className="crm-pipe-empty">Chỉ quản lý xem được doanh thu.</p>
          ) : (
            <div className="crm-bars" role="img" aria-label="Doanh thu theo tuần">
              {data.weekly.map((w) => (
                <div key={w.label}>
                  <i style={{ height: `${Math.max(3, (w.revenue / max) * 100)}%` }} title={money(w.revenue)} />
                  <small>{w.label}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="crm-card crm-recent">
          <header>
            <h3><Users size={20} /> Khách hàng gần đây</h3>
            <button type="button" onClick={() => onPage('leads')}>Xem tất cả <ArrowRight size={14} /></button>
          </header>
          <div className="crm-table-wrap">
            <table>
              <thead>
                <tr><th>Khách hàng</th><th>SĐT</th><th>Giai đoạn</th><th>Giá trị cơ hội</th><th>Phụ trách</th><th>Cập nhật</th></tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id} onClick={() => onLead(r.id)}>
                    <td><b>{r.name}</b><small>{r.email}</small></td>
                    <td><Phone size={13} /> {r.phone}</td>
                    <td><span className={'crm-pill ' + r.stage.toLowerCase()}>{STAGE_LABELS[r.stage as Stage] ?? r.stage}</span></td>
                    <td className="num">{money(r.value)}</td>
                    <td>{r.owner || '—'}</td>
                    <td>{ago(r.updated, now)}</td>
                  </tr>
                ))}
                {data.recent.length === 0 && <tr><td colSpan={6} className="crm-pipe-empty">Chưa có lead nào.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="crm-card crm-act">
          <header>
            <h3>Hoạt động gần đây</h3>
            <button type="button" onClick={() => onPage('customers')}>Xem tất cả <ArrowRight size={14} /></button>
          </header>
          <ol>
            {data.activity.map((a) => (
              <li key={a.id}>
                <time>{hhmm(a.at)}</time>
                <span className="dot"><UserPlus size={14} /></span>
                <div><b>{a.lead || 'Hệ thống'}</b><small>{a.text}</small></div>
              </li>
            ))}
            {data.activity.length === 0 && <li className="crm-pipe-empty">Chưa có hoạt động.</li>}
          </ol>
        </section>

        <section className="crm-card crm-todo">
          <header>
            <h3><CalendarDays size={20} /> Công việc hôm nay ({data.tasks.length})</h3>
            <button type="button" onClick={() => onPage('care')}>Xem tất cả <ArrowRight size={14} /></button>
          </header>
          <ul>
            {data.tasks.map((t) => (
              <li key={t.id} className={t.done ? 'done' : ''}>
                <span className="box">{t.done && <Check size={13} />}</span>
                <b>{t.title}</b>
                <time>{hhmm(t.due)}</time>
              </li>
            ))}
            {data.tasks.length === 0 && <li className="crm-pipe-empty">Hôm nay chưa có công việc.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
