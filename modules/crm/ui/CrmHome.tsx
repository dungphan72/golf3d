'use client';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
} from 'lucide-react';

const tabs = ['Tất cả khách hàng', 'Hội viên', 'Khách tiềm năng', 'Khách doanh nghiệp', 'Khách VIP'];

const customers = [
  { id: '1', name: 'Nguyễn Hoàng Long', phone: '0877 834 888', status: 'Gold', source: 'Gọi điện', note: 'Lần cuối: 19/11/2026', tag: 'Điểm', value: '18.5%' },
  { id: '2', name: 'Trần Minh Anh', phone: '0932 456 789', status: 'Platinum', source: 'Zalo', note: 'Lần cuối: 17/11/2026', tag: 'Của bạn', value: '22%' },
  { id: '3', name: 'Lê Quốc Bảo', phone: '0901 234 567', status: 'Silver', source: 'Email', note: 'Lần cuối: 12/11/2026', tag: 'Mới', value: '12%' },
  { id: '4', name: 'Phạm Thu Hà', phone: '0988 765 432', status: 'Gold', source: 'Website', note: 'Lần cuối: 11/11/2026', tag: 'Nạp gói', value: '9%' },
  { id: '5', name: 'Vũ Đức Thắng', phone: '0903 678 999', status: 'Gold', source: 'Đặt sân', note: 'Lần cuối: 10/11/2026', tag: 'VIP', value: '28%' },
];

const history = [
  { id: 1, type: 'Đặt sân thành công', time: 'Hôm nay, 14:30', icon: CalendarDays, color: 'green' },
  { id: 2, type: 'Gọi điện tư vấn', time: 'Hôm nay, 10:15', icon: Phone, color: 'blue' },
  { id: 3, type: 'Gửi email', time: '12/11, 16:40', icon: Mail, color: 'violet' },
  { id: 4, type: 'Gọi chốt', time: '10/11, 09:20', icon: MessageSquare, color: 'orange' },
];

const appointments = [
  { id: 1, title: 'Đặt sân thành công', meta: 'Line L3 · 18:00 – 20:00 (2 giờ)', status: 'Hoàn tất', tone: 'success' },
  { id: 2, title: 'Gọi điện tư vấn', meta: 'Tư vấn gói Gold và lịch thử', status: 'Chờ xác nhận', tone: 'warning' },
  { id: 3, title: 'Gửi email', meta: 'Thông tin gia hạn gói', status: 'Đã gửi', tone: 'info' },
  { id: 4, title: 'Khách hàng thân thiết', meta: 'Voucher sinh nhật', status: 'Chờ phản hồi', tone: 'neutral' },
];

const detailTabs = ['Thông tin', 'Hội viên & Gói', 'Lịch sử đặt sân', 'Cơ hội', 'Ghi chú'];

export function CrmHome({ onLead, onPage }: { onLead: (id: string) => void; onPage: (p: 'leads' | 'pipeline' | 'care' | 'appointments' | 'customers') => void }) {
  return (
    <div className="crm-dashboard">
      <div className="crm-dashboard-topbar">
        <div className="crm-search-box" aria-label="Tìm khách hàng">
          <Search size={17} />
          <span>Tìm khách hàng, SĐT, email...</span>
          <span className="crm-search-shortcut">⌘K</span>
        </div>

        <div className="crm-top-actions">
          <button type="button" className="crm-primary-btn" onClick={() => onPage('appointments')}>+ Đặt sân</button>
          <button type="button" className="crm-secondary-btn" onClick={() => onPage('customers')}>+ Tạo khách hàng</button>
          <button type="button" className="crm-icon-btn" aria-label="Thông báo">
            <Bell size={17} />
          </button>
          <button type="button" className="crm-icon-btn" aria-label="Trợ giúp">
            <CircleHelp size={17} />
          </button>
          <div className="crm-user-chip">
            <div className="crm-user-avatar">A</div>
            <div className="crm-user-meta">
              <strong>Admin</strong>
              <small>Quản trị</small>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-page-header">
        <div>
          <h1>CRM Khách hàng</h1>
          <p>Quản lý thông tin khách hàng, hội viên và lịch sử tương tác</p>
        </div>
      </div>

      <div className="crm-tab-row" aria-label="Phân loại khách hàng">
        {tabs.map((tab, idx) => (
          <button key={tab} type="button" className={idx === 0 ? 'crm-tab active' : 'crm-tab'} onClick={() => onPage('customers')}>
            {tab}
          </button>
        ))}
      </div>

      <div className="crm-layout">
        <aside className="crm-list-panel">
          <div className="crm-list-toolbar">
            <div className="crm-list-search">
              <Search size={17} />
              <input aria-label="Tìm khách hàng" placeholder="Tìm theo tên, SĐT..." />
            </div>
          </div>

          <div className="crm-filter-row">
            <button type="button" className="crm-filter-item active">Tất cả</button>
            <button type="button" className="crm-filter-item">Học viện</button>
            <button type="button" className="crm-filter-item">Mới</button>
            <button type="button" className="crm-filter-item">Đã săn</button>
          </div>

          <div className="crm-customer-list">
            {customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="crm-customer-card"
                onClick={() => onLead(customer.id)}
              >
                <div className="crm-customer-photo">
                  <span>{customer.name.split(' ').slice(-2).map((x) => x[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="crm-customer-main">
                  <div className="crm-customer-title-row">
                    <strong>{customer.name}</strong>
                    <span className={`crm-status-badge ${customer.status.toLowerCase()}`}>{customer.status}</span>
                  </div>
                  <div className="crm-customer-meta-row">
                    <span>{customer.phone}</span>
                    <span className="crm-source-tag">{customer.source}</span>
                  </div>
                  <div className="crm-customer-note">{customer.note}</div>
                </div>
                <div className="crm-customer-tail">
                  <span className="crm-delta">{customer.value}</span>
                  <small>{customer.tag}</small>
                </div>
              </button>
            ))}
          </div>

          <div className="crm-pagination">
            <span>Hiển thị 1–8 trong 1.248</span>
            <div className="crm-pager">
              <button type="button">‹</button>
              <button type="button" className="current">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">›</button>
            </div>
          </div>
        </aside>

        <section className="crm-detail-panel">
          <div className="crm-profile-card">
            <div className="crm-profile-header">
              <div className="crm-detail-avatar">NL</div>
              <div className="crm-profile-copy">
                <div className="crm-profile-name-row">
                  <h2>Nguyễn Hoàng Long</h2>
                  <span className="crm-status-badge gold">Gold</span>
                </div>
                <div className="crm-profile-meta">Mã KH: KHO000188</div>
                <div className="crm-profile-meta">Hội viên: HV-GD-0023</div>
              </div>
              <div className="crm-profile-actions">
                <button type="button" className="crm-mini-btn"><Phone size={15} /> Gọi</button>
                <button type="button" className="crm-mini-btn"><MessageSquare size={15} /> Zalo</button>
                <button type="button" className="crm-mini-btn"><Mail size={15} /> Email</button>
                <button type="button" className="crm-mini-btn alt"><MoreHorizontal size={15} /></button>
              </div>
            </div>

            <div className="crm-detail-tabs">
              {detailTabs.map((detailTab, idx) => (
                <button key={detailTab} type="button" className={idx === 0 ? 'active' : ''}>{detailTab}</button>
              ))}
            </div>

            <div className="crm-detail-body">
              <div className="crm-detail-columns">
                <div className="crm-detail-info">
                  <div className="crm-info-row">
                    <label>Thời gian</label>
                    <span className="crm-detail-value">Trống tin cậy</span>
                  </div>
                  <div className="crm-info-row">
                    <label>Hội viên & Gói</label>
                    <span className="crm-detail-value">Gold</span>
                  </div>
                  <div className="crm-info-row">
                    <label>Lịch sử</label>
                    <span className="crm-detail-value">Đặt sân 4 lần / 1 năm</span>
                  </div>
                  <div className="crm-info-row">
                    <label>Giao dịch</label>
                    <span className="crm-detail-value">Tổng chi: 6.200.000đ</span>
                  </div>
                </div>

                <div className="crm-detail-stat-grid">
                  <div className="crm-stat-box">
                    <span>Số điện thoại</span>
                    <strong>0902 030 185</strong>
                  </div>
                  <div className="crm-stat-box">
                    <span>Email</span>
                    <strong>long.nguyen@gmail.com</strong>
                  </div>
                  <div className="crm-stat-box">
                    <span>Tổng giá trị</span>
                    <strong>24.500.000đ</strong>
                  </div>
                  <div className="crm-stat-box">
                    <span>Đánh giá</span>
                    <strong>4.9/5</strong>
                  </div>
                </div>
              </div>

              <div className="crm-detail-subsection">
                <div className="crm-subsection-header">
                  <h3>Thông tin cơ bản</h3>
                  <button type="button">Chỉnh sửa</button>
                </div>

                <div className="crm-mini-grid">
                  <div className="crm-mini-card">
                    <span>Loại khách</span>
                    <strong>Khách hàng</strong>
                  </div>
                  <div className="crm-mini-card">
                    <span>Nhóm</span>
                    <strong>Hội viên</strong>
                  </div>
                  <div className="crm-mini-card">
                    <span>Người phụ trách</span>
                    <strong>Team Sale</strong>
                  </div>
                  <div className="crm-mini-card">
                    <span>Địa chỉ</span>
                    <strong>250 Lương Định Của</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="crm-rail-panel">
          <div className="crm-side-card">
            <div className="crm-side-header">
              <h3>Lịch sử tương tác</h3>
            </div>
            <div className="crm-side-list">
              {history.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="crm-side-item">
                    <div className={`crm-side-icon ${item.color}`}><Icon size={15} /></div>
                    <div className="crm-side-copy">
                      <strong>{item.type}</strong>
                      <small>{item.time}</small>
                    </div>
                    <ChevronRight size={15} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="crm-side-card">
            <div className="crm-side-header">
              <h3>Công việc & Lịch hẹn</h3>
              <button type="button">+ Thêm</button>
            </div>
            <div className="crm-task-list">
              {appointments.map((task) => (
                <div key={task.id} className="crm-task-item">
                  <div className="crm-task-bullet" />
                  <div className="crm-task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.meta}</small>
                  </div>
                  <span className={`crm-task-badge ${task.tone}`}>{task.status}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
