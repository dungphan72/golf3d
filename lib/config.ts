import { z } from 'zod';
import { validateRules } from './pricing.ts';
import { validatePromotions, type Promotion } from './promotions.ts';
import { crmSettingsSchema } from './crm.ts';
const money = z.number().int().min(0).max(100_000_000);
const minutes = z.number().int().min(0).max(1440);
const capacity = z.number().int().min(1).max(100).nullable();
const clock = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ hoạt động không hợp lệ');
const fourPrices = z.array(money).length(4);
const ruleSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(80),
  service: z.enum(['gdr', '9', '18']),
  room: z.enum(['standard', 'vip']),
  day: z.enum(['weekday', 'weekend', 'holiday']),
  from: z.string().max(5),
  to: z.string().max(5),
  people: z.number().int().min(1).max(4).nullable(),
  amount: money.refine((n) => n > 0, 'Đơn giá phải lớn hơn 0'),
  enabled: z.boolean(),
});
const promotionSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
  kind: z.enum(['percent', 'amount', 'price']),
  value: z.number().int().min(1).max(100_000_000),
  services: z.array(z.enum(['gdr', '9', '18'])).max(3),
  rooms: z.array(z.enum(['standard', 'vip'])).max(2),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  from: z.string().max(5),
  to: z.string().max(5),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  auto: z.boolean(),
  enabled: z.boolean(),
});
const holiday = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => {
    const x = new Date(d + 'T00:00:00Z');
    return Number.isFinite(x.getTime()) && x.toISOString().slice(0, 10) === d;
  }, 'Ngày lễ không hợp lệ');
export const configSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().min(1).max(300),
    open: clock,
    close: clock,
    vat: z.number().min(0).max(100).multipleOf(0.01).nullable(),
    fee: z.number().min(0).max(100_000_000).multipleOf(0.01).nullable(),
    feeMode: z.enum(['percent', 'fixed']).default('percent'),
    feeServices: z
      .array(z.enum(['gdr', '9', '18']))
      .max(3)
      .default(['gdr', '9', '18']),
    minBillMinutes: z.number().int().min(0).max(240).default(60),
    capacity,
    vipCapacity: capacity,
    rate: money,
    happy: money,
    vipRate: money.nullable(),
    vipHappy: money.nullable(),
    hole9: fourPrices,
    hole18: fourPrices,
    vip9: fourPrices,
    vip18: fourPrices,
    holeMinutes9: z.array(minutes).length(4),
    holeMinutes18: z.array(minutes).length(4),
    buffer: minutes,
    clean: minutes,
    vipClean: minutes,
    days: z.number().int().min(0).max(365),
    grace: minutes,
    cancelHours: z.number().min(0).max(2160),
    published: z.boolean(),
    bankBin: z
      .string()
      .regex(/^(\d{6})?$/, 'Mã BIN ngân hàng gồm 6 chữ số')
      .default(''),
    bankAccount: z
      .string()
      .regex(/^(\d{6,20})?$/, 'Số tài khoản gồm 6–20 chữ số')
      .default(''),
    bankHolder: z.string().trim().max(60).default(''),
    onlineEnabled: z.boolean().default(false),
    onlineSlug: z
      .string()
      .regex(/^([a-z0-9][a-z0-9-]{2,39})?$/, 'Mã đường dẫn gồm 3–40 ký tự a-z, 0-9, dấu gạch ngang')
      .default(''),
    offers: z.array(z.string().trim().min(1).max(400)).max(20).default([]),
    promotions: z.array(promotionSchema).max(50).default([]),
    // Stored by the CRM screen; kept here so saving the settings form never drops it.
    crm: crmSettingsSchema.partial().optional(),
    memberBenefits: z.array(z.string().trim().min(1).max(300)).max(12).optional(),
    tierThresholds: z
      .object({
        gold: z.number().int().min(1).max(100_000_000_000),
        platinum: z.number().int().min(1).max(100_000_000_000),
        diamond: z.number().int().min(1).max(100_000_000_000),
      })
      .optional(),
    priceRules: z.array(ruleSchema).max(300),
    holidays: z.array(holiday).max(366),
    hotline: z.string().trim().max(40).optional(),
    email: z.string().trim().max(120).optional(),
    website: z.string().trim().max(200).optional(),
    logo: z.string().trim().max(300).optional(),
    invoiceHeader: z.string().trim().max(150).optional(),
    taxCode: z.string().trim().max(40).optional(),
    invoiceFooterNote: z.string().trim().max(200).optional(),
    depositPercent: z.number().min(0).max(100).optional(),
    autoCancelGrace: z.number().min(0).max(1440).optional(),
    generalConfig: z
      .object({
        language: z.string().max(10).optional(),
        currency: z.string().max(10).optional(),
        dateFormat: z.string().max(20).optional(),
        soundAlert: z.boolean().optional(),
        autoRefreshSec: z.number().int().min(5).max(3600).optional(),
      })
      .optional(),
    marketingConfig: z
      .object({
        fbPixel: z.string().max(80).optional(),
        ga4Id: z.string().max(80).optional(),
        mapsPlaceId: z.string().max(120).optional(),
        zaloOaId: z.string().max(80).optional(),
      })
      .optional(),
    matchmakingConfig: z
      .object({
        enabled: z.boolean().optional(),
        maxHdcDiff: z.number().min(0).max(54).optional(),
        autoNotifyZalo: z.boolean().optional(),
      })
      .optional(),
    tournamentConfig: z
      .object({
        defaultFormat: z.string().max(80).optional(),
        hdcSystem: z.string().max(80).optional(),
        liveLeaderboard: z.boolean().optional(),
      })
      .optional(),
    academyConfig: z
      .object({
        commissionRate: z.number().min(0).max(100).optional(),
        lessonMinutes: z.number().int().min(15).max(480).optional(),
        freeTrialAvailable: z.boolean().optional(),
      })
      .optional(),
    customTables: z
      .record(z.string().max(80), z.array(z.record(z.string().max(60), z.string().max(500))).max(200))
      .optional(),
    customCards: z
      .array(
        z.object({
          id: z.string().max(80),
          cat: z.string().max(40),
          title: z.string().max(120),
          subtitle: z.string().max(200),
          badge: z.string().max(60),
          badgeType: z.string().max(30),
          iconBg: z.string().max(40),
          meta: z
            .array(z.object({ label: z.string().max(80), value: z.string().max(120) }))
            .max(10),
        }),
      )
      .max(100)
      .optional(),
    cardTitleOverrides: z
      .record(
        z.string().max(80),
        z.object({
          title: z.string().max(120),
          subtitle: z.string().max(200),
          badge: z.string().max(60),
        }),
      )
      .optional(),
    hiddenCardIds: z.array(z.string().max(80)).max(100).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.feeMode === 'fixed' && c.fee != null && !Number.isInteger(c.fee))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fee'],
        message: 'Phí cố định phải là số đồng nguyên',
      });
    if (c.feeMode === 'percent' && (c.fee ?? 0) > 100)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fee'],
        message: 'Phí phần trăm không vượt 100%',
      });
    if (c.tierThresholds) {
      const { gold, platinum, diamond } = c.tierThresholds;
      if (!(gold < platinum && platinum < diamond))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tierThresholds'],
          message: 'Mốc hạng phải tăng dần: Gold < Platinum < Diamond',
        });
    }
    if (new Set(c.holidays).size !== c.holidays.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['holidays'],
        message: 'Ngày lễ bị trùng',
      });
    if (new Set(c.feeServices).size !== c.feeServices.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['feeServices'],
        message: 'Dịch vụ áp phí bị trùng',
      });
    try {
      validatePromotions(c.promotions as Promotion[]);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promotions'],
        message: e instanceof Error ? e.message : 'Khuyến mãi không hợp lệ',
      });
    }
    try {
      validateRules(c.priceRules);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceRules'],
        message: e instanceof Error ? e.message : 'Bảng giá không hợp lệ',
      });
    }
  });
