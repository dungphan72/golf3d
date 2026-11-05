import { db, loadConfig } from './common';
import { officialPriceRules } from '../official-pricing';
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

export type PublicPricing = {
  standard: PriceTable;
  vip: PriceTable | null; // null = the VIP room shares the standard prices
  groups: PackageGroup[];
  vat: number | null;
  fee: number | null;
  open: string;
  close: string;
  offers: string[];
  benefits: string[];
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
        vat: config.vat,
        fee: config.fee,
        open: config.open,
        close: config.close,
        offers: config.offers ?? [],
        benefits: config.memberBenefits ?? DEFAULT_BENEFITS,
        source: 'admin',
      };
    }
  } catch (e) {
    console.error('public pricing', e);
  }
  const rules = officialPriceRules();
  return {
    standard: buildPriceTable(rules, 'standard'),
    vip: null,
    groups: groupPackages(fallbackItems()),
    vat: null,
    fee: null,
    open: '08:00',
    close: '23:00',
    offers: [],
    benefits: DEFAULT_BENEFITS,
    source: 'default',
  };
}
