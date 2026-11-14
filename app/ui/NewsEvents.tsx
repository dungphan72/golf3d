/* eslint-disable @next/next/no-html-link-for-pages -- plain links, like the rest of the public site */
import { CalendarDays, MapPin } from 'lucide-react';
import type { Post } from '../../lib/server/content-service';
import { Icon } from './Icon';

const dateText = (ms: number | null) =>
  ms == null
    ? ''
    : new Date(ms).toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
const timeText = (ms: number | null) =>
  ms == null
    ? ''
    : new Date(ms).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });

export const postDate = dateText;
export const postTime = timeText;

/** Next event as a banner, and the latest news beside it. Renders nothing when the club has published none. */
export function EventsNews({ upcoming, news, contact }: { upcoming: Post[]; news: Post[]; contact: string }) {
  if (!upcoming.length && !news.length) return null;
  const next = upcoming[0];
  return (
    <section className="sg-in sg-block sg-block--tight" id="tin-tuc">
      <div className="sg-news-grid">
        {next && (
          <div>
            <header className="sg-head sg-head--row">
              <h2>Giải đấu &amp; Sự kiện</h2>
              <a className="sg-link" href="/tin-tuc">
                Xem tất cả
              </a>
            </header>
            <article className="sg-event" style={next.image ? { backgroundImage: `url(${next.image})` } : undefined}>
              <div className="sg-event-in">
                <span className="sg-event-tag">Sắp diễn ra</span>
                <h3>
                  <a href={`/tin-tuc/${next.id}`}>{next.title}</a>
                </h3>
                {next.summary && <p>{next.summary}</p>}
                <ul>
                  <li>
                    <CalendarDays size={18} />
                    {dateText(next.event_at)} · {timeText(next.event_at)}
                  </li>
                  {next.place && (
                    <li>
                      <MapPin size={18} />
                      {next.place}
                    </li>
                  )}
                </ul>
                <a className="sg-btn" href={`/tin-tuc/${next.id}#dang-ky`}>
                  Đăng ký tham gia
                  <Icon name="arrow" size={18} />
                </a>
              </div>
            </article>
          </div>
        )}
        {news.length > 0 && (
          <div>
            <header className="sg-head sg-head--row">
              <h2>Tin tức &amp; Cập nhật</h2>
              <a className="sg-link" href="/tin-tuc">
                Xem tất cả
              </a>
            </header>
            <ul className="sg-news">
              {news.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <a href={`/tin-tuc/${p.id}`}>
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" width={120} height={80} loading="lazy" />
                    ) : (
                      <span className="sg-news-ph" aria-hidden="true" />
                    )}
                    <span>
                      <strong>{p.title}</strong>
                      <small>
                        <CalendarDays size={14} /> {dateText(p.created)}
                      </small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
