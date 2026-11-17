import { db } from './common';
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from '../landing-config';
import { bookingSlug } from './online-service';
import { publicPricing, type PublicPricing } from './pricing-service';
import { publicTenant } from './member-account-service';
import { publicContent, type Post } from './content-service';

export type LandingData = {
  slug: string | null;
  pricing: PublicPricing;
  tenant: string | null;
  content: { news: Post[]; upcoming: Post[]; past: Post[] };
};

let cachedLanding: { data: LandingData; expires: number } | null = null;

export async function getCachedLandingData(now = Date.now()): Promise<LandingData> {
  if (cachedLanding && now < cachedLanding.expires) {
    return cachedLanding.data;
  }
  const [slug, pricing, tenant] = await Promise.all([bookingSlug(), publicPricing(), publicTenant()]);
  const content = tenant ? await publicContent(tenant, now) : { news: [], upcoming: [], past: [] };
  const data: LandingData = { slug, pricing, tenant, content };
  cachedLanding = { data, expires: now + 30_000 }; // Cache in memory for 30 seconds
  return data;
}

export function invalidateLandingCache() {
  cachedLanding = null;
}

export async function getPublicLandingConfig(): Promise<LandingConfig> {
  try {
    const row =
      (await db()
        .prepare("SELECT value FROM settings WHERE json_extract(value,'$.onlineEnabled')=1 LIMIT 1")
        .first<{ value: string }>()) ??
      (await db().prepare('SELECT value FROM settings LIMIT 1').first<{ value: string }>());

    if (!row?.value) {
      return DEFAULT_LANDING_CONFIG;
    }

    const val = JSON.parse(row.value);
    const landing = val.landing || {};

    return {
      ...DEFAULT_LANDING_CONFIG,
      ...landing,
      galleryPhotos: landing.galleryPhotos?.length ? landing.galleryPhotos : DEFAULT_LANDING_CONFIG.galleryPhotos,
      amenities: landing.amenities?.length ? landing.amenities : DEFAULT_LANDING_CONFIG.amenities,
      testimonials: landing.testimonials?.length ? landing.testimonials : DEFAULT_LANDING_CONFIG.testimonials,
      standardHighlights: landing.standardHighlights?.length ? landing.standardHighlights : DEFAULT_LANDING_CONFIG.standardHighlights,
      vipHighlights: landing.vipHighlights?.length ? landing.vipHighlights : DEFAULT_LANDING_CONFIG.vipHighlights,
    };
  } catch (err) {
    console.error('getPublicLandingConfig error:', err);
    return DEFAULT_LANDING_CONFIG;
  }
}
