/** Pipeline stages and the two-level status catalogue of the CRM module (service consultation). */
export const STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VISIT_SCHEDULED',
  'VISITED',
  'DEPOSITED',
  'WON',
  'LOST',
] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: readonly Stage[] = STAGES.filter((s) => s !== 'WON' && s !== 'LOST');
export const STAGE_LABELS: Record<Stage, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  QUALIFIED: 'Có nhu cầu',
  VISIT_SCHEDULED: 'Hẹn trải nghiệm',
  VISITED: 'Đã trải nghiệm',
  DEPOSITED: 'Đặt cọc',
  WON: 'Chốt',
  LOST: 'Thất bại',
};
/** Stages in which a lead may be taken back to the pool. */
export const RECALLABLE_STAGES: readonly Stage[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VISIT_SCHEDULED',
  'VISITED',
];

export const isStage = (v: unknown): v is Stage =>
  (STAGES as readonly string[]).includes(String(v));

export function normalizeStage(raw: unknown): Stage {
  if (isStage(raw)) return raw;
  const v = String(raw ?? '');
  if (v === 'IN_PROGRESS') return 'QUALIFIED';
  if (v === 'CONVERTED') return 'WON';
  if (v === 'CANCELLED') return 'LOST';
  return 'NEW';
}

export const LOST_REASONS = [
  'Không liên lạc được',
  'Chưa có nhu cầu',
  'Giá cao / ngân sách',
  'Chọn nơi khác',
  'Ở xa, đi lại bất tiện',
  'Khác',
] as const;

export type StatusDef = { id: string; name: string; stage: Stage; group: string; system: boolean };
export type StatusGroup = { id: string; name: string; color: string };
export type StatusCatalog = { groups: StatusGroup[]; statuses: StatusDef[] };

const g = (id: string, name: string, color: string): StatusGroup => ({ id, name, color });
const s = (id: string, name: string, stage: Stage, group: string): StatusDef => ({
  id,
  name,
  stage,
  group,
  system: true,
});
export const DEFAULT_CATALOG: StatusCatalog = {
  groups: [
    g('moi', '1. Khách mới', '#3b82f6'),
    g('tu-van', '2. Đang tư vấn', '#06b6d4'),
    g('tiem-nang', '3. Tiềm năng', '#f59e0b'),
    g('da-trai-nghiem', '4. Đã trải nghiệm', '#8b5cf6'),
    g('da-mua', '5. Đã mua dịch vụ', '#16a34a'),
    g('khong-tiem-nang', '6. Không tiềm năng', '#6b7280'),
  ],
  statuses: [
    s('khach-moi', 'Khách mới', 'NEW', 'moi'),
    s('chua-lien-lac-1', 'Chưa liên lạc được lần 1', 'NEW', 'moi'),
    s('chua-lien-lac-2', 'Chưa liên lạc được lần 2', 'NEW', 'moi'),
    s('chua-lien-lac-3', 'Chưa liên lạc được lần 3', 'NEW', 'moi'),
    s('da-lien-he', 'Đã liên hệ', 'CONTACTED', 'tu-van'),
    s('goi-lai-1', 'Gọi lại tư vấn tiếp lần 1', 'QUALIFIED', 'tu-van'),
    s('goi-lai-2', 'Gọi lại tư vấn tiếp lần 2', 'QUALIFIED', 'tu-van'),
    s('goi-lai-3', 'Gọi lại tư vấn tiếp lần 3', 'QUALIFIED', 'tu-van'),
    s('hen-trai-nghiem', 'KH hẹn đến trải nghiệm', 'VISIT_SCHEDULED', 'tiem-nang'),
    s('da-trai-nghiem', 'Đã đến trải nghiệm', 'VISITED', 'da-trai-nghiem'),
    s('dat-coc', 'KH đã đặt cọc', 'DEPOSITED', 'da-mua'),
    s('da-mua', 'KH đã mua dịch vụ', 'WON', 'da-mua'),
    s('khong-lien-lac-duoc', 'KH không liên lạc được', 'LOST', 'khong-tiem-nang'),
    s('khong-mua', 'KH không mua', 'LOST', 'khong-tiem-nang'),
    s('khong-den-trai-nghiem', 'KH không đến trải nghiệm', 'LOST', 'khong-tiem-nang'),
    s('bo-qua', 'Bỏ qua', 'LOST', 'khong-tiem-nang'),
  ],
};

/** Status given to a lead when it enters a stage and no detailed status was chosen. */
export const DEFAULT_STATUS_BY_STAGE: Record<Stage, string> = {
  NEW: 'khach-moi',
  CONTACTED: 'da-lien-he',
  QUALIFIED: 'goi-lai-1',
  VISIT_SCHEDULED: 'hen-trai-nghiem',
  VISITED: 'da-trai-nghiem',
  DEPOSITED: 'dat-coc',
  WON: 'da-mua',
  LOST: 'khong-mua',
};

/** URL-safe id from a name: no accents, lower case, dashes, at most 40 characters. */
export function slugify(name: string): string {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
/** Makes a stored catalogue usable: system statuses always present, bad entries dropped. */
export function sanitizeCatalog(raw: unknown): StatusCatalog {
  const input = (raw ?? {}) as Partial<StatusCatalog>;
  const groups: StatusGroup[] = DEFAULT_CATALOG.groups.map((d) => {
    const found = Array.isArray(input.groups)
      ? input.groups.find((x) => x?.id === d.id)
      : undefined;
    return {
      id: d.id,
      name:
        typeof found?.name === 'string' && found.name.trim()
          ? found.name.trim().slice(0, 40)
          : d.name,
      color: typeof found?.color === 'string' && COLOR.test(found.color) ? found.color : d.color,
    };
  });
  const groupIds = new Set(groups.map((x) => x.id));
  const out: StatusDef[] = DEFAULT_CATALOG.statuses.map((d) => {
    const found = Array.isArray(input.statuses)
      ? input.statuses.find((x) => x?.id === d.id)
      : undefined;
    return {
      ...d,
      name:
        typeof found?.name === 'string' && found.name.trim()
          ? found.name.trim().slice(0, 60)
          : d.name,
    };
  });
  const seen = new Set(out.map((x) => x.id));
  for (const x of Array.isArray(input.statuses) ? input.statuses : []) {
    if (!x || typeof x.name !== 'string' || !x.name.trim()) continue;
    if (!isStage(x.stage) || !groupIds.has(String(x.group))) continue;
    const id = slugify(x.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: x.name.trim().slice(0, 60),
      stage: x.stage,
      group: x.group,
      system: false,
    });
  }
  return { groups, statuses: out };
}

export function statusFor(catalog: StatusCatalog, stage: Stage, statusId?: string | null): string {
  const found = statusId ? catalog.statuses.find((x) => x.id === statusId) : undefined;
  if (found && found.stage === stage) return found.id;
  const def = DEFAULT_STATUS_BY_STAGE[stage];
  return catalog.statuses.some((x) => x.id === def)
    ? def
    : (catalog.statuses.find((x) => x.stage === stage)?.id ?? def);
}

/** Checks a stage change the way the API must: lost needs a reason, won needs a value. */
export function validateStageChange(
  to: Stage,
  o: { lostReason?: string | null; dealValue?: number | null },
): string | null {
  if (to === 'LOST' && !String(o.lostReason ?? '').trim()) return 'Chọn lý do thất bại';
  if (to === 'WON' && !(Number(o.dealValue) > 0)) return 'Nhập giá trị giao dịch khi chốt';
  return null;
}
