'use client';
import { Flag, CalendarDays, ArrowUpRight, Plus, ChevronRight } from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { labels, time, date, type Data } from './shared';
export function Stat({
  title,
  value,
  sub,
  icon,
  suffix,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  suffix?: string;
}) {
  return (
    <article className="stat">
      <div>
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>
        {value}
        <small>{suffix}</small>
      </strong>
      <p>{sub}</p>
    </article>
  );
}
export function RoomGrid({
  bookings,
  filter,
  now,
  onSelect,
  onBook,
}: {
  bookings: Booking[];
  filter: string;
  now: number;
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
}) {
  return (
    <div className="room-grid">
      {rooms
        .filter((r) => filter === 'all' || (filter === 'vip' ? r.vip : !r.vip))
        .map((r) => {
          const live = bookings.find(
            (b) => b.room === r.id && ['playing', 'paused'].includes(b.status),
          );
          const clean = bookings.find(
            (b) => b.room === r.id && ['finished', 'paid'].includes(b.status) && b.end > now,
          );
          const next = bookings
            .filter((b) => b.room === r.id && b.status === 'booked' && b.end > now)
            .sort((a, b) => a.start - b.start)[0];
          const item = live ?? next;
          return (
            <button
              className={
                'room-card ' +
                (live ? 'occupied' : clean ? 'clean' : next ? 'has-booking' : '') +
                (r.vip ? ' vip' : '')
              }
              key={r.id}
              onClick={() => (item ? onSelect(item) : onBook(r.id))}
            >
              <div className="room-top">
                <span className="room-type">
                  {r.vip ? 'PRIVATE ROOM' : r.left ? 'LEFT-HANDED' : 'GDR PRACTICE'}
                </span>
                {r.vip ? (
                  <Flag size={17} />
                ) : (
                  <span className="room-number">{r.id.split('-')[1].padStart(2, '0')}</span>
                )}
              </div>
              <h3>{r.name}</h3>
              <span className="room-status">
                <i />
                {live ? labels[live.status] : clean ? 'Đang dọn' : next ? 'Đã đặt' : 'Sẵn sàng'}
              </span>
              <div className="room-bottom">
                {live ? (
                  <>
                    <span>{live.customer}</span>
                    <span>{time(live.start)}</span>
                  </>
                ) : next ? (
                  <>
                    <span>
                      {date(next.start)} · {time(next.start)}
                    </span>
                    <ArrowUpRight size={14} />
                  </>
                ) : (
                  <>
                    <span>
                      {r.vip
                        ? 'Không gian riêng tư'
                        : r.left
                          ? 'Dành cho golfer tay trái'
                          : 'Chọn để đặt lịch'}
                    </span>
                    <Plus size={15} />
                  </>
                )}
              </div>
            </button>
          );
        })}
    </div>
  );
}
export function BookingTable({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  if (!bookings.length)
    return (
      <Empty
        title="Chưa có lịch trong danh sách"
        text="Tạo lịch đặt đầu tiên để bắt đầu quản lý trải nghiệm tại Golf3D."
      />
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Phòng / Line</th>
            <th>Ngày & giờ</th>
            <th>Dịch vụ</th>
            <th>Trạng thái</th>
            <th>Thành tiền</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                <button className="customer-name" onClick={() => onSelect(b)}>
                  {b.customer}
                </button>
                <small>{b.phone}</small>
              </td>
              <td>{rooms.find((r) => r.id === b.room)?.name}</td>
              <td>
                {date(b.start)} · {time(b.start)}
              </td>
              <td>
                {b.service === 'gdr' ? 'GDR' : b.service + ' hố'} · {b.people} người
              </td>
              <td>
                <span className={'badge ' + b.status}>{labels[b.status]}</span>
              </td>
              <td>{b.amount == null ? '—' : money(b.amount)}</td>
              <td>
                <button className="icon-btn" aria-label="Mở chi tiết" onClick={() => onSelect(b)}>
                  <ChevronRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <CalendarDays size={29} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Roadmap({ audit }: { audit: Data['audit'] }) {
  return (
    <>
      <div className="info-strip">
        Bản 0.4 · Chạy thử nội bộ bằng danh tính Sites. Chưa thay thế phần mềm vận hành chính thức.
      </div>
      <div className="roadmap-grid">
        {[
          [
            '01',
            'Đặt lịch & phiên chơi',
            'Đang chạy thử',
            'Lịch đặt lưu D1, chống trùng, phiên chơi, bảng giá ngày/giờ/lễ, gói theo nhóm, phí cố định/%, báo giá trước đặt, thanh toán thủ công và hỗ trợ cơ bản.',
          ],
          [
            '02',
            'Vận hành tại cơ sở',
            'Đang triển khai',
            'Đã có mở/đóng ca, sổ tiền và đối soát. Đã có gọi món tại phiên và bếp/bar. Còn phân quyền chi tiết, QR gọi món khách hàng, kho, nhà cung cấp, luân chuyển hàng, chuyển phòng và quy trình duyệt tài chính.',
          ],
          [
            '03',
            'Khách hàng & kinh doanh',
            'Chưa triển khai',
            'OTP golfer, hội viên, ví, gói giờ/lượt, HLV, CRM, giải đấu, báo cáo lợi nhuận, Zalo/email/SMS và hóa đơn điện tử.',
          ],
          [
            '04',
            'Nền tảng SaaS',
            'Chưa triển khai',
            'Chủ cơ sở tự đăng ký, phân quyền tổ chức/chi nhánh, thương hiệu riêng, gói thuê bao, tên miền, onboarding và kiểm thử cách ly dữ liệu.',
          ],
        ].map(([n, t, s, d]) => (
          <article key={n} className="roadmap-card">
            <span>{n}</span>
            <div>
              <small>{s}</small>
              <h2>{t}</h2>
              <p>{d}</p>
            </div>
          </article>
        ))}
      </div>
      <h2 className="audit-title">Nhật ký gần đây</h2>
      <div className="audit-list">
        {audit.length ? (
          audit.map((a) => (
            <div key={a.id}>
              <span>
                {date(a.created)} · {time(a.created)}
              </span>
              <strong>{a.action}</strong>
              <small>{a.detail}</small>
            </div>
          ))
        ) : (
          <p className="muted">Chưa có thao tác được ghi nhận.</p>
        )}
      </div>
    </>
  );
}
