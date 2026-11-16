import { db, loadConfig } from './common';
import { officialPriceRules } from '../official-pricing';
import { buildPoster, type PosterCard } from '../price-poster';
import { benefitText, conditionText, vnParts, type Promotion } from '../promotions';
import { DEFAULT_BENEFITS } from '../member-benefits';
import { OFFICIAL_PACKAGES } from '../official-packages';
import {
  buildPriceTable,
  groupPackages,
  parseGrants,
  vipDiffers,
  type PackageGroup,
  type PackageItem,
  type PriceTable,
} from '../price-table';

export type PublicPromotion = {
  id: string;
  name: string;
  description: string;
  benefit: string;
  condition: string;
  auto: boolean;
};

/** Promotions the site shows: enabled and not past their end date. */
export function livePromotions(list: Promotion[] | undefined, now = Date.now()): PublicPromotion[] {
  const today = vnParts(now).date;
  return (list ?? [])
    .filter((p) => p.enabled && (!p.endDate || p.endDate >= today))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      benefit: benefitText(p),
      condition: conditionText(p),
      auto: p.auto,
    }));
}

export type PublicPricing = {
  standard: PriceTable;
  vip: PriceTable | null; // null = the VIP room shares the standard prices
  groups: PackageGroup[];
  /** Price cards of the public price page, built from the same rules. */
  poster: PosterCard[];
  vat: number | null;
  fee: number | null;
  open: string;
  close: string;
  offers: string[];
  promotions: PublicPromotion[];
  benefits: string[];
  clubName?: string;
  clubAddress?: string;
  hotline?: string;
  logo?: string;
  days?: number;
  source: 'admin' | 'default';
};

/** The club whose prices the public site shows: the one taking online bookings, else the first. */
async function publicTenant(): Promise<string | null> {
  const row =
    (await db()
      .prepare("SELECT tenant FROM settings WHERE json_extract(value,'$.onlineEnabled')=1 LIMIT 1")
      .first<{ tenant: string }>()) ??
    (await db().prepare('SELECT tenant FROM settings LIMIT 1').first<{ tenant: string }>());
  return row?.tenant ?? null;
}

const fallbackItems = (): PackageItem[] =>
  OFFICIAL_PACKAGES.map((p) => ({
    id: p.key,
    name: p.name,
    price: p.price,
    grants: p.grants,
    validDays: p.validDays,
    perks: p.perks,
    section: p.section,
  }));

/** Live prices from the admin (price rules + active package catalogue); the official list if nothing is saved yet. */
export async function publicPricing(): Promise<PublicPricing> {
  try {
    const tenant = await publicTenant();
    if (tenant) {
      const config = await loadConfig(tenant);
      const rules = config.priceRules?.length ? config.priceRules : officialPriceRules();
      const rows = (
        await db()
          .prepare(
            'SELECT id,name,price,grants,valid_days,perks,section,room FROM package_types WHERE tenant=? AND active=1 ORDER BY price',
          )
          .bind(tenant)
          .all<{
            id: string;
            name: string;
            price: number;
            grants: string;
            valid_days: number;
            perks: string;
            section: string;
            room: string;
          }>()
      ).results;
      const items: PackageItem[] = rows.length
        ? rows.map((r) => ({
            id: r.id,
            name: r.name,
            price: r.price,
            grants: parseGrants(r.grants),
            validDays: r.valid_days,
            perks: r.perks,
            section: r.section,
            room: r.room,
          }))
        : fallbackItems();
      return {
        standard: buildPriceTable(rules, 'standard'),
        vip: vipDiffers(rules) ? buildPriceTable(rules, 'vip') : null,
        groups: groupPackages(items),
        poster: buildPoster(rules),
        vat: config.vat,
        fee: config.fee,
        open: config.open || '06:00',
        close: config.close || '23:00',
        offers: config.offers ?? [],
        promotions: livePromotions(config.promotions),
        benefits: config.memberBenefits ?? DEFAULT_BENEFITS,
        clubName: config.name,
        clubAddress: config.address,
        hotline: config.hotline,
        logo: config.logo,
        days: config.days,
        source: 'admin',
      };
    }
  } catch (e) {
    console.error('public pricing', e);
  }
  const rules = officialPriceRules();
  return {
    standard: buildPriceTable(rules, 'standard'),
    vip: vipDiffers(rules) ? buildPriceTable(rules, 'vip') : null,
    groups: groupPackages(fallbackItems()),
    poster: buildPoster(rules),
    vat: null,
    fee: null,
    open: '06:00',
    close: '23:00',
    offers: [],
    promotions: [],
    benefits: DEFAULT_BENEFITS,
    source: 'default',
  };
}
