/* eslint-disable @next/next/no-html-link-for-pages -- plain links, like the rest of the public site */
import type { Metadata } from 'next';
import '../sub.css';
import { BRAND } from '../../lib/brand';
import { publicContent } from '../../lib/server/content-service';
import { publicTenant } from '../../lib/server/member-account-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { postDate, postTime } from '../ui/NewsEvents';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Tin tức & sự kiện — ${BRAND.name}`,
  description: `Tin tức, giải đấu và sự kiện tại ${BRAND.name}.`,
};

export default async function NewsPage() {
  const tenant = await publicTenant();
  const c = tenant ? await publicContent(tenant) : { news: [], upcoming: [], past: [] };
  const empty = !c.news.length && !c.upcoming.length && !c.past.length;
  return (
    <div className="sg-page hd-home hd-inner">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader active="/tin-tuc" />
      <main id="top">
        <section className="sg-pagehead">
          <p className="sg-kicker">Tin tức &amp; sự kiện</p>
          <h1>Giải đấu, sự kiện và tin từ câu lạc bộ</h1>
        </section>
        {empty && (
          <section className="sg-in sg-block">
            <p className="sg-lead">Câu lạc bộ chưa đăng tin hay sự kiện nào. Mời bạn quay lại sau.</p>
          </section>
        )}
        {c.upcoming.length > 0 && (
          <section className="sg-in sg-block sg-block--tight">
            <header className="sg-head sg-head--row">
              <h2>Sắp diễn ra</h2>
            </header>
            <ul className="sg-posts">
              {c.upcoming.map((p) => (
                <li key={p.id}>
                  <a href={`/tin-tuc/${p.id}`}>
                    <strong>{p.title}</strong>
                    <small>
                      {postDate(p.event_at)} · {postTime(p.event_at)}
                      {p.place ? ` · ${p.place}` : ''}
                    </small>
                    {p.summary && <span>{p.summary}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {c.news.length > 0 && (
          <section className="sg-in sg-block sg-block--tight">
            <header className="sg-head sg-head--row">
              <h2>Tin tức</h2>
            </header>
            <ul className="sg-posts">
              {c.news.map((p) => (
                <li key={p.id}>
                  <a href={`/tin-tuc/${p.id}`}>
                    <strong>{p.title}</strong>
                    <small>{postDate(p.created)}</small>
                    {p.summary && <span>{p.summary}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {c.past.length > 0 && (
          <section className="sg-in sg-block sg-block--tight">
            <header className="sg-head sg-head--row">
              <h2>Đã diễn ra</h2>
            </header>
            <ul className="sg-posts">
              {c.past.map((p) => (
                <li key={p.id}>
                  <a href={`/tin-tuc/${p.id}`}>
                    <strong>{p.title}</strong>
                    <small>{postDate(p.event_at)}</small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
