/* eslint-disable @next/next/no-html-link-for-pages -- plain links, like the rest of the public site */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAND } from '../../../lib/brand';
import { publicTenant } from '../../../lib/server/member-account-service';
import { publicBoard } from '../../../lib/server/tournament-score-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { TournamentBoard, type BoardData } from '../../ui/TournamentBoard';

export const dynamic = 'force-dynamic';

async function load(id: string): Promise<BoardData | null> {
  const tenant = await publicTenant();
  if (!tenant) return null;
  const r = await publicBoard(tenant, id, null, null);
  return r.status === 200 ? (r.body as unknown as BoardData) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id);
  return data
    ? { title: `Bảng xếp hạng ${data.event.title} — ${BRAND.name}`, description: data.event.summary || undefined }
    : { title: `Không tìm thấy giải đấu — ${BRAND.name}`, robots: { index: false } };
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const data = await load(id);
  if (!data) notFound();
  return (
    <div className="sg-page hd-home hd-inner">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader active="/tin-tuc" />
      <TournamentBoard initial={data} postHref={`/tin-tuc/${id}`} />
      <SiteFooter />
    </div>
  );
}
