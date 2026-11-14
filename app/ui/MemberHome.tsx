'use client';
import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Crown,
  Gem,
  Gift,
  Layers,
  Star,
  Trophy,
  Wallet,
} from 'lucide-react';
import { rooms, money } from '../../lib/club';
import { parseBenefit } from '../../lib/member-benefits';
import { TIER_LABEL, type Tier } from '../../lib/member-card';
import { BRAND } from '../../lib/brand';
import type { Overview } from './MemberPortal';
import type { MemberTab } from './MemberShell';

const TIER_ICON: Record<Tier, typeof Crown> = { diamond: Gem, platinum: Crown, gold: Crown, member: Star, guest: Star };

const vn = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...opts });
const day = (ms: number) => vn(ms, { day: '2-digit', month: '2-digit', year: 'numeric' });
const hm = (ms: number) => vn(ms, { hour: '2-digit', minute: '2-digit' });
const weekday = (ms: number) => vn(ms, { weekday: 'long' });
const dm = (ms: number) => vn(ms, { day: '2-digit', month: '2-digit' });

const STATUS: Record<string, string> = {
  booked: 'Đã xác nhận',
  playing: 'Đang chơi',
  paused: 'Tạm nghỉ',
  finished: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
};

function PortalCard({ name, code, tier, expires }: { name: string; code: string; tier: Tier; expires: number | null }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    const q = qrcode(0, 'M');
    // Same payload as the counter scanner expects: the member code opens this member in the staff area.
    q.addData(`${window.location.origin}/quan-ly?hv=${code}`);
    q.make();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value (origin) computed once per code
    setSvg(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
  }, [code]);
  const Icon = TIER_ICON[tier];
  return (
    <section className={'mps-card mps-card--' + tier} aria-label="Thẻ hội viên điện tử">
      <div className="mps-card-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo} alt="" width={64} height={64} />
        <span className="mps-card-title">
          <Icon size={22} /> {tier === 'guest' ? 'Thành viên' : tier === 'member' ? 'Hội viên' : `Hội viên ${TIER_LABEL[tier]}`}
        </span>
        {(tier === 'gold' || tier === 'platinum' || tier === 'diamond') && <b className="mps-card-pill">{TIER_LABEL[tier]}</b>}
      </div>
      <div className="mps-card-main">
        <div>
          <h2>{name}</h2>
          <p>Mã hội viên: {code}</p>
          {expires && <small>Gói còn hạn đến {day(expires)}</small>}
        </div>
        <div className="mps-qr" role="img" aria-label={`Mã QR của thẻ ${code}`} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </section>
  );
}

/** The member's home: card, shortcuts, upcoming bookings, activity, package, points and perks. */
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
  const packs = data.packages ?? [];
  const live = packs.filter((p) => p.expires >= now);
  const hoursLeft = live.reduce((n, p) => n + (p.balances.find((b) => b.kind === 'gdr')?.remaining ?? 0), 0);
  const hourPack = live
    .filter((p) => p.balances.some((b) => b.kind === 'gdr'))
    .sort((a, b) => (b.balances.find((x) => x.kind === 'gdr')?.remaining ?? 0) - (a.balances.find((x) => x.kind === 'gdr')?.remaining ?? 0))[0];
  let hourTotal = 0;
  try {
    hourTotal = (JSON.parse(hourPack?.grants ?? '[]') as { kind: string; qty: number }[])
      .filter((g) => g.kind === 'gdr')
      .reduce((n, g) => n + g.qty, 0);
  } catch {
    hourTotal = 0;
  }
  const hourLeft = hourPack?.balances.find((b) => b.kind === 'gdr')?.remaining ?? 0;
  const unlimited = hourLeft >= 99999;
  const used = Math.max(0, hourTotal - hourLeft);
  const pct = unlimited || !hourTotal ? 0 : Math.min(100, Math.round((used / hourTotal) * 100));

  const upcoming = [
    ...(data.bookings ?? []).filter((b) => b.start >= now - 3_600_000 && ['booked', 'playing', 'paused'].includes(b.status)).map((b) => ({
      id: b.id,
      start: b.start,
      end: b.end,
      place: rooms.find((r) => r.id === b.room)?.name ?? b.room,
      vip: b.room.startsWith('vip'),
      status: STATUS[b.status] ?? b.status,
    })),
    ...(data.requests ?? []).map((r) => ({
      id: r.id,
      start: r.start,
      end: 0,
      place: r.vip ? 'Phòng VIP' : 'Line tiêu chuẩn',
      vip: !!r.vip,
      status: STATUS[r.status] ?? r.status,
    })),
  ]
    .sort((a, b) => a.start - b.start)
    .slice(0, 4);

  const benefits = (data.benefits ?? []).map(parseBenefit).filter((b) => b.title).slice(0, 5);
  const promo = data.promotions?.[0];
  const rank = data.rank;
  const first = (data.profile.name.trim().split(/\s+/).slice(-1)[0] || 'bạn');
  const rankName = TIER_LABEL[tier];
  const bookable = !!data.booking?.enabled;

  return (
    <div className="mph">
      <div className="mph-greet">
        <h1>Chào {first}!</h1>
        <p>Chúc bạn có buổi tập luyện hiệu quả tại {data.club?.name ?? BRAND.name}.</p>
      </div>

      <div className="mph-grid">
        <div className="mph-col">
          <PortalCard
            name={data.profile.name}
            code={data.code ?? ''}
            tier={tier}
            expires={live.length ? Math.max(...live.map((p) => p.expires)) : null}
          />
          {rank?.next && (
            <p className="mph-next">
              Chi tiêu thêm <b>{money(rank.next.need)}</b> để lên hạng <b>{TIER_LABEL[rank.next.tier]}</b>. Đã chi: {money(rank.spent)}.
            </p>
          )}

          <ul className="mph-stats" aria-label="Số dư của bạn">
            <li>
              <Wallet size={22} />
              <span>
                Số dư ví
                <b>{money(data.wallet ?? 0)}</b>
              </span>
            </li>
            <li>
              <Clock size={22} />
              <span>
                Giờ còn lại
                <b>{hoursLeft >= 99999 ? 'Không giới hạn' : `${hoursLeft} giờ`}</b>
              </span>
            </li>
            <li>
              <Star size={22} />
              <span>
                Điểm thưởng
                <b>{(data.points ?? 0).toLocaleString('vi-VN')} điểm</b>
              </span>
            </li>
          </ul>

          <div className="mph-shortcuts" role="group" aria-label="Lối tắt">
            <button type="button" className="on" onClick={() => onTab('booking')} disabled={!bookable} title={bookable ? undefined : 'Chưa mở đặt line online'}>
              <CalendarDays size={26} />
              Đặt line ngay
            </button>
            <button type="button" onClick={() => onTab('packages')}>
              <Layers size={26} />
              Mua gói giờ
            </button>
            <button type="button" onClick={() => onTab('packages')}>
              <Crown size={26} />
              Nâng hạng hội viên
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/tin-tuc">
              <Trophy size={26} />
              Giải đấu
            </a>
          </div>

          <section className="mph-panel" aria-label="Lịch đặt line sắp tới">
            <header>
              <h2>
                <CalendarDays size={22} /> Lịch đặt line sắp tới
              </h2>
              <button type="button" onClick={() => onTab('booking')}>
                Xem tất cả <ChevronRight size={16} />
              </button>
            </header>
            {upcoming.length ? (
              <ul className="mph-bookings">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <span className="mph-date">
                      <small>{weekday(b.start)}</small>
                      <b>{dm(b.start)}</b>
                    </span>
                    <span className="mph-time">
                      <Clock size={17} />
                      {hm(b.start)}
                      {b.end ? ` – ${hm(b.end)}` : ''}
                    </span>
                    <span className="mph-place">
                      {b.vip ? <Crown size={17} /> : <Star size={17} />}
                      {b.place}
                    </span>
                    <span className="mph-status">
                      <Check size={15} /> {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mph-empty">
                Bạn chưa có lịch sắp tới.{' '}
                {bookable && (
                  <button type="button" onClick={() => onTab('booking')}>
                    Đặt line ngay
                  </button>
                )}
              </p>
            )}
          </section>

          <section className="mph-panel" aria-label="Hoạt động gần đây">
            <header>
              <h2>
                <Clock size={22} /> Hoạt động gần đây
              </h2>
              <button type="button" onClick={() => onTab('history')}>
                Xem chi tiết <ChevronRight size={16} />
              </button>
            </header>
            {data.activity?.length ? (
              <table className="mph-activity">
                <tbody>
                  {data.activity.slice(0, 5).map((a, i) => (
                    <tr key={i}>
                      <td>{day(a.at)}</td>
                      <td>{a.title}</td>
                      <td className={(a.money ?? a.points ?? 0) < 0 ? 'neg' : (a.money ?? a.points ?? 0) > 0 ? 'pos' : ''}>
                        {a.money != null
                          ? `${a.money > 0 ? '+' : '−'}${money(Math.abs(a.money))}`
                          : a.points != null
                            ? `${a.points > 0 ? '+' : '−'}${Math.abs(a.points).toLocaleString('vi-VN')} điểm`
                            : a.paid != null
                              ? money(a.paid)
                              : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mph-empty">Chưa có hoạt động nào.</p>
            )}
          </section>
        </div>

        <div className="mph-col">
          <section className="mph-hero" aria-label="Foresight GC3">
            <h2>
              Tập luyện Golf 3D
              <span>Công nghệ Foresight GC3</span>
            </h2>
            <ul>
              <li>Phân tích chuẩn xác</li>
              <li>Cải thiện kỹ thuật</li>
              <li>Nâng cao thành tích</li>
            </ul>
          </section>

          <div className="mph-two">
            <section className="mph-panel" aria-label="Thông tin gói giờ">
              <header>
                <h2>
                  <Layers size={22} /> Thông tin gói giờ
                </h2>
              </header>
              {hourPack ? (
                <>
                  <div className="mph-pack">
                    <div>
                      <strong>{hourPack.name}</strong>
                      <p>{unlimited ? 'Không giới hạn giờ' : `Còn lại: ${hourLeft} giờ`}</p>
                    </div>
                    <small>
                      Hết hạn:
                      <br />
                      {day(hourPack.expires)}
                    </small>
                  </div>
                  {!unlimited && hourTotal > 0 && (
                    <>
                      <div className="mph-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Giờ đã dùng">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mph-fine">
                        Đã sử dụng: {used} giờ / {hourTotal} giờ
                      </p>
                    </>
                  )}
                </>
              ) : (
                <p className="mph-empty">
                  Bạn chưa có gói giờ còn hạn.{' '}
                  <button type="button" onClick={() => onTab('packages')}>
                    Mua gói giờ
                  </button>
                </p>
              )}
            </section>

            <section className="mph-panel" aria-label="Quyền lợi hội viên">
              <header>
                <h2>
                  <Crown size={22} /> Quyền lợi {tier === 'guest' || tier === 'member' ? 'hội viên' : `hội viên ${rankName}`}
                </h2>
              </header>
              {benefits.length ? (
                <ul className="mph-perks">
                  {benefits.map((b) => (
                    <li key={b.title}>
                      <Check size={18} />
                      {b.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mph-empty">Câu lạc bộ chưa đăng quyền lợi.</p>
              )}
            </section>
          </div>

          <section className="mph-panel mph-points" aria-label="Điểm thưởng">
            <header>
              <h2>
                <Gift size={22} /> Điểm thưởng
              </h2>
            </header>
            <p className="mph-big">
              {(data.points ?? 0).toLocaleString('vi-VN')} <small>điểm</small>
            </p>
            <p className="mph-fine">10 điểm đổi 1 lượt chơi miễn phí. Đổi tại quầy khi bạn đến chơi.</p>
          </section>

          {promo && (
            <section className="mph-offer" aria-label="Ưu đãi">
              <h2>{promo.name}</h2>
              <p>{promo.benefit}</p>
              <button type="button" onClick={() => onTab('offers')}>
                Xem ngay <ChevronRight size={16} />
              </button>
            </section>
          )}
        </div>
      </div>

      <section className="mph-ranks" aria-label="Các hạng hội viên">
        <header>
          <h2>
            <Crown size={22} /> Hạng hội viên
          </h2>
        </header>
        <div className="mph-rank-row">
          {(['gold', 'platinum', 'diamond'] as const).map((t) => {
            const at = rank?.thresholds?.[t] ?? 0;
            const reached = rank ? rank.spent >= at : false;
            const Icon = TIER_ICON[t];
            return (
              <article key={t} className={'mph-rank' + (tier === t ? ' now' : '')}>
                <h3>
                  <Icon size={22} /> {TIER_LABEL[t]}
                  {tier === t && <b>Hạng của bạn</b>}
                </h3>
                <p>
                  Chi tiêu từ <strong>{money(at)}</strong>
                </p>
                <small>{reached ? 'Đã đạt mốc này' : rank ? `Còn ${money(Math.max(0, at - rank.spent))}` : ''}</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
