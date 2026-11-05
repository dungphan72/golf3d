import { z } from 'zod';
import { validateRules } from './pricing.ts';
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
    memberBenefits: z.array(z.string().trim().min(1).max(300)).max(12).optional(),
    priceRules: z.array(ruleSchema).max(300),
    holidays: z.array(holiday).max(366),
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
      validateRules(c.priceRules);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceRules'],
        message: e instanceof Error ? e.message : 'Bảng giá không hợp lệ',
      });
    }
  });
