/* eslint-disable @next/next/no-html-link-for-pages -- plain links, like the rest of the public site */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '../../home2.css';
import '../../sub.css';
import { BRAND } from '../../../lib/brand';
import { publicPost } from '../../../lib/server/content-service';
import { publicTenant } from '../../../lib/server/member-account-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { postDate, postTime } from '../../ui/NewsEvents';
import EventSignup from '../../ui/EventSignup';

export const dynamic = 'force-dynamic';

async function load(id: string) {
  const tenant = await publicTenant();
  const post = tenant ? await publicPost(tenant, id) : null;
  // Signing up is open until the event starts.
  return post && { ...post, openForSignup: post.kind === 'event' && post.event_at != null && post.event_at > Date.now() };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const post = await load((await params).id);
  return post
    ? { title: `${post.title} — ${BRAND.name}`, description: post.summary || undefined }
    : { title: `Không tìm thấy bài — ${BRAND.name}`, robots: { index: false } };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const post = await load((await params).id);
  if (!post) notFound();
  // The body is plain text: blank lines split paragraphs; React escapes everything.
  const paragraphs = post.body
    .split(/\r?\n\s*\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref="/#dat-cho" bookLabel="Đặt line" />
      <main id="top">
        <article className="sg-in sg-block sg-article">
          <a className="sg-link" href="/tin-tuc">
            ← Tin tức &amp; sự kiện
          </a>
          <h1>{post.title}</h1>
          <p className="sg-article-meta">
            {post.kind === 'event'
              ? `${postDate(post.event_at)} · ${postTime(post.event_at)}${post.place ? ' · ' + post.place : ''}`
              : postDate(post.created)}
          </p>
          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt="" width={960} height={540} />
          )}
          {post.summary && <p className="sg-lead">{post.summary}</p>}
          {paragraphs.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          {post.openForSignup && <EventSignup postId={post.id} />}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
