'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from 'react';
import qrcode from 'qrcode-generator';
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  Check,
  Clock3,
  Coins,
  CreditCard,
  Crown,
  Flag,
  Gift,
  History,
  Layers,
  MoreHorizontal,
  Star,
  Tag,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { money, rooms } from '../../lib/club';
import { isWalletLow } from '../../lib/wallet';
import { parseBenefit } from '../../lib/member-benefits';
import { TIER_LABEL, type Tier } from '../../lib/member-card';
import type { Overview } from './MemberPortal';
import type { MemberTab } from './MemberShell';
import '../member-reference.css';
const date = (n: number) =>
  new Date(n).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
const time = (n: number) =>
  new Date(n).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
const STATUS: Record<string, string> = {
  booked: 'Đã xác nhận',
  confirmed: 'Đã xác nhận',
  pending: 'Chờ xác nhận',
  playing: 'Đang chơi',
  paused: 'Tạm nghỉ',
};
function Card({ data, tier }: { data: Overview; tier: Tier }) {
  const qrRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!data.code) return;
    const q = qrcode(0, 'M');
    q.addData(`${window.location.origin}/quan-ly?hv=${data.code}`);
    q.make();
    if (qrRef.current)
      qrRef.current.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, [data.code]);
  return (
    <section className={`mr-card mr-card-${tier}`} aria-label="Thẻ hội viên điện tử">
      <div className="mr-card-wave" />
      <div className="mr-card-title">
        <img src={BRAND.logo} alt="" />
        <span>
          <Crown />
          Hội viên <b>{tier === 'guest' ? '' : TIER_LABEL[tier]}</b>
        </span>
        <strong className="mr-tier-pill">
          {data.profile.verified ? TIER_LABEL[tier] : 'Đăng nhập'}
        </strong>
      </div>
      <div className="mr-card-name">
        <h2>
          {data.profile.verified ? (
            data.profile.name
          ) : (
            <a href="/tai-khoan">Đăng nhập để xem thẻ</a>
          )}
        </h2>
        <p>
          {data.profile.verified
            ? `Mã hội viên: ${data.code || 'Chưa cấp'}`
            : 'Quản lý thẻ, số dư và lịch tập của bạn'}
        </p>
      </div>
      {data.code && (
        <div ref={qrRef} className="mr-qr" role="img" aria-label={`Mã QR hội viên ${data.code}`} />
      )}
    </section>
  );
}
function Heading({
  icon: I,
  title,
  more,
  onClick,
}: {
  icon: typeof Crown;
  title: string;
  more?: string;
  onClick?: () => void;
}) {
  return (
    <header className="mr-heading">
      <h2>
        <I />
        {title}
      </h2>
      {more && (
        <button type="button" onClick={onClick}>
          {more}
          <ArrowRight />
        </button>
      )}
    </header>
  );
}
export function MemberHome({
  data,
  now,
  tier,
  onTab,
}: {
  data: Overview;
  now: number;
  tier: Tier;
  onTab: (t: MemberTab) => void;
}) {
  const live = (data.packages ?? []).filter((p) => p.expires >= now);
  const pack = live.find((p) => p.balances.some((b) => b.kind === 'gdr'));
  const hours = live.reduce(
    (n, p) => n + (p.balances.find((b) => b.kind === 'gdr')?.remaining ?? 0),
    0,
  );
  const left = pack?.balances.find((b) => b.kind === 'gdr')?.remaining ?? 0;
  let total = 0;
  try {
    total = (JSON.parse(pack?.grants || '[]') as { kind: string; qty: number }[])
      .filter((g) => g.kind === 'gdr')
      .reduce((n, g) => n + g.qty, 0);
  } catch {
    total = 0;
  }
  const unlimited = left >= 99999,
    used = Math.max(0, total - left),
    percent = total ? Math.min(100, (used / total) * 100) : 0;
  const name = data.profile.name.trim().split(/\s+/).at(-1) || 'bạn';
  const tierTitle =
    tier === 'guest' || tier === 'member' ? 'hội viên' : `hội viên ${TIER_LABEL[tier]}`;
  const benefits = (data.benefits ?? []).map(parseBenefit).filter((b) => b.title);
  const upcoming = [
    ...(data.bookings ?? [])
      .filter((b) => b.start >= now - 3600000 && ['booked', 'playing', 'paused'].includes(b.status))
      .map((b) => ({
        ...b,
        place: rooms.find((r) => r.id === b.room)?.name ?? b.room,
        vip: b.room.startsWith('vip'),
      })),
    ...(data.requests ?? [])
      .filter((b) => b.start >= now && ['pending', 'confirmed'].includes(b.status))
      .map((b) => ({ ...b, end: 0, place: b.vip ? 'Phòng VIP' : 'Line tiêu chuẩn', vip: !!b.vip })),
  ]
    .sort((a, b) => a.start - b.start)
    .slice(0, 2);
  const promo = data.promotions?.[0];
  const shortcuts = [
    { icon: CalendarCheck, label: 'Đặt sân ngay', tab: 'booking' },
    { icon: CreditCard, label: 'Mua gói giờ', tab: 'packages' },
    { icon: Crown, label: 'Nâng hạng Hội viên', tab: 'packages' },
    { icon: Trophy, label: 'Đăng ký giải đấu', href: '/tin-tuc' },
    { icon: UsersRound, label: 'Tìm bạn chơi', tab: 'community' },
  ] as const;
  return (
    <div className="mr-home">
      <div className="mr-greeting">
        <h1>{data.profile.verified ? `Chào ${name}!` : 'Chào mừng bạn!'}</h1>
        <p>Chúc bạn có buổi tập luyện hiệu quả tại {data.club?.name || BRAND.name}.</p>
      </div>
      <div className="mr-columns">
        <div className="mr-left">
          <Card data={data} tier={tier} />
          <div className="mr-stats">
            {[
              {
                icon: Coins,
                label: 'Số dư ví',
                value: data.profile.verified
                  ? `${money(data.wallet ?? 0)}${isWalletLow(data.wallet ?? 0) ? ' (thấp)' : ''}`
                  : 'Đăng nhập',
                tab: 'packages',
              },
              {
                icon: Clock3,
                label: 'Giờ còn lại',
                value: !data.profile.verified
                  ? 'Đăng nhập'
                  : hours >= 99999
                    ? 'Không giới hạn'
                    : `${hours} giờ`,
                tab: 'packages',
              },
              {
                icon: Star,
                label: 'Điểm thưởng',
                value: data.profile.verified
                  ? (data.points ?? 0).toLocaleString('vi-VN') + ' điểm'
                  : 'Đăng nhập',
                tab: 'history',
              },
            ].map(({ icon: I, label, value, tab }) => (
              <button
                key={label}
                onClick={() => onTab(data.profile.verified ? (tab as MemberTab) : 'settings')}
              >
                <I />
                <span>
                  {label}
                  <b>
                    {value}
                    <ArrowRight />
                  </b>
                </span>
              </button>
            ))}
          </div>
          <div className="mr-shortcuts">
            {shortcuts.map(({ icon: I, label, ...item }, i) =>
              'href' in item ? (
                <a key={label} href={item.href}>
                  <I />
                  {label}
                </a>
              ) : (
                <button
                  key={label}
                  className={i === 0 ? 'primary' : ''}
                  onClick={() => onTab(item.tab)}
                  disabled={i === 0 && !data.booking?.enabled}
                >
                  <I />
                  {label}
                </button>
              ),
            )}
          </div>
          <section className="mr-panel mr-bookings">
            <Heading
              icon={CalendarDays}
              title="Lịch đặt sân sắp tới"
              more="Xem tất cả"
              onClick={() => onTab('booking')}
            />
            {upcoming.length ? (
              <div>
                {upcoming.map((b) => (
                  <button className="mr-booking-row" key={b.id} onClick={() => onTab('booking')}>
                    <span className="mr-date">
                      <small>
                        {new Date(b.start).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </small>
                      <b>{date(b.start).slice(0, 5)}</b>
                    </span>
                    <span>
                      <Clock3 />
                      {time(b.start)}
                      {b.end ? ' – ' + time(b.end) : ''}
                    </span>
                    <span>
                      {b.vip ? <Crown /> : <Flag />}
                      {b.place}
                    </span>
                    <span className={'mr-status ' + (b.status === 'pending' ? 'pending' : '')}>
                      <Check />
                      {STATUS[b.status] || b.status}
                    </span>
                    <MoreHorizontal />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mr-empty">
                {data.profile.verified
                  ? 'Bạn chưa có lịch đặt sân sắp tới.'
                  : 'Đăng nhập để xem lịch đặt sân của bạn.'}
              </p>
            )}
          </section>
          <section className="mr-panel mr-activity">
            <Heading
              icon={History}
              title="Hoạt động gần đây"
              more="Xem chi tiết"
              onClick={() => onTab('history')}
            />
            {data.activity?.length ? (
              <div>
                {data.activity.slice(0, 3).map((a, i) => (
                  <button className="mr-activity-row" key={i} onClick={() => onTab('history')}>
                    <span className="mr-activity-icon">
                      {a.kind === 'points' ? (
                        <Star />
                      ) : a.kind === 'wallet' ? (
                        <Coins />
                      ) : (
                        <CalendarDays />
                      )}
                    </span>
                    <time>{date(a.at)}</time>
                    <strong>{a.title}</strong>
                    <b className={(a.money ?? a.points ?? 0) < 0 ? 'negative' : 'positive'}>
                      {a.money != null
                        ? `${a.money > 0 ? '+' : '−'}${money(Math.abs(a.money))}`
                        : a.points != null
                          ? `${a.points > 0 ? '+' : '−'}${Math.abs(a.points).toLocaleString('vi-VN')} điểm`
                          : a.paid != null
                            ? money(a.paid)
                            : ''}
                    </b>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mr-empty">
                {data.profile.verified
                  ? 'Chưa có giao dịch. Các hoạt động của bạn sẽ hiển thị tại đây.'
                  : 'Đăng nhập để xem hoạt động và lịch sử giao dịch.'}
              </p>
            )}
          </section>
        </div>
        <div className="mr-right">
          <section className="mr-hero">
            <img
              src="/img/member/hero.webp"
              alt="Tập luyện Golf 3D — Công nghệ Foresight GC3. Phân tích chuẩn xác, cải thiện kỹ thuật, nâng cao thành tích"
            />
          </section>
          <div className="mr-info">
            <section className="mr-panel mr-package">
              <Heading icon={Layers} title="Thông tin gói giờ" />
              {pack ? (
                <>
                  <div className="mr-pack-details">
                    <div>
                      <h3>{pack.name}</h3>
                      <p>
                        Còn lại: <b>{unlimited ? 'Không giới hạn' : left + ' giờ'}</b>
                      </p>
                    </div>
                    <small>
                      Hết hạn:
                      <br />
                      {date(pack.expires)}
                    </small>
                  </div>
                  {!unlimited && total > 0 && (
                    <>
                      <div
                        className="mr-progress"
                        role="progressbar"
                        aria-label="Giờ đã sử dụng"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                      >
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mr-used">
                        Đã sử dụng: {used} giờ / {total} giờ
                      </p>
                    </>
                  )}
                </>
              ) : (
                <p className="mr-empty">
                  {data.profile.verified
                    ? 'Bạn chưa có gói giờ còn hạn.'
                    : 'Đăng nhập để xem các gói giờ của bạn.'}{' '}
                  <button onClick={() => onTab('packages')}>
                    Mua gói giờ <ArrowRight />
                  </button>
                </p>
              )}
            </section>
            <section className="mr-panel mr-benefits">
              <Heading
                icon={Crown}
                title={`Quyền lợi ${tierTitle}`}
                more="Xem chi tiết"
                onClick={() => onTab('offers')}
              />
              {benefits.length ? (
                <ul>
                  {benefits.slice(0, 5).map((b, i) => {
                    const I = [Tag, CalendarDays, Coins, Gift, Star][i];
                    return (
                      <li key={b.title}>
                        <I className="mr-benefit-icon" />
                        <Check className="mr-benefit-check" />
                        <span>{b.title}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mr-empty">Quyền lợi hội viên sẽ được câu lạc bộ cập nhật tại đây.</p>
              )}
            </section>
            <section className="mr-panel mr-points">
              <Heading icon={Gift} title="Điểm thưởng" />
              <div>
                <strong>
                  {data.profile.verified ? (data.points ?? 0).toLocaleString('vi-VN') : '—'}{' '}
                  <small>điểm</small>
                </strong>
                <button onClick={() => onTab('offers')}>
                  Đổi ưu đãi <ArrowRight />
                </button>
              </div>
            </section>
          </div>
          <button className="mr-offer" onClick={() => onTab('offers')}>
            <span>
              <strong>
                {promo?.name || 'Ưu đãi dành riêng'}
                <br />
                {!promo && (
                  <>
                    cho <em>{tierTitle}</em>
                  </>
                )}
              </strong>
              <small>
                Xem ngay <ArrowRight />
              </small>
            </span>
          </button>
        </div>
      </div>
      <section className="mr-catalog">
        <Heading
          icon={CalendarCheck}
          title="Gói hội viên & Gói giờ"
          more="Xem tất cả"
          onClick={() => onTab('packages')}
        />
        <div className="mr-catalog-scroll">
          {data.catalog?.length ? (
            data.catalog.map((p, i) => (
              <article key={p.id} className={i === 0 ? 'featured' : ''}>
                <h3>
                  <Crown />
                  {p.name}
                </h3>
                <strong>{money(p.price)}</strong>
                <ul>
                  <li>
                    <Check />
                    {p.room === 'vip' ? 'Sử dụng phòng VIP' : 'Line tiêu chuẩn'}
                  </li>
                  {p.valid_days && (
                    <li>
                      <Check />
                      Thời hạn {p.valid_days} ngày
                    </li>
                  )}
                  <li>
                    <Check />
                    Quản lý trực tuyến
                  </li>
                </ul>
                <button onClick={() => onTab('packages')}>Đăng ký ngay</button>
              </article>
            ))
          ) : (
            <p className="mr-empty">Chưa có gói đang mở bán.</p>
          )}
        </div>
      </section>
    </div>
  );
}
