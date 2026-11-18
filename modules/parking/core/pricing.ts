/**
 * Saigon Indoor Golf (SIGOLF) — Module Bãi Đậu Xe
 * Pricing & Sponsorship Rules Engine
 * 
 * Rules:
 * - Base rate snapshot at hold time (e.g. 30.000 đ/lượt hoặc theo block giờ).
 * - Golf booking sponsorship: nếu khách có lịch chơi hợp lệ, GoPick tài trợ toàn bộ hoặc một phần.
 * - Khung tài trợ: tối đa golfFreeHours (mặc định 3 giờ). Khách trả 0 đ nếu trong khung tài trợ.
 * - Vượt giờ tại cổng: nếu xe ra muộn hơn expectedOut + 15 phút ân hạn (grace period), tính phụ thu theo overtimeRatePerHour.
 */

export interface PricingParams {
  expectedIn: number;
  expectedOut: number;
  defaultHourlyRate: number;
  golfFreeHours?: number;
  isGolfSponsored?: boolean;
  overtimeRatePerHour?: number;
  actualOut?: number;
}

export interface PricingResult {
  durationHours: number;
  baseAmount: number;
  sponsoredAmount: number;
  customerPay: number;
  feePayer: 'customer' | 'gopick_sponsored' | 'split';
  overtimeHours: number;
  overtimeAmount: number;
  finalTotal: number;
}

/**
 * Calculates duration in whole hours rounded up (minimum 1 hour).
 */
export function calculateDurationHours(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 1;
  const diffHours = (endMs - startMs) / (1000 * 60 * 60);
  return Math.max(1, Math.ceil(diffHours));
}

/**
 * Computes parking fee, sponsorship subsidy, and potential overtime surcharge.
 * Fully zero-division safe and non-negative.
 */
export function calculateParkingPricing(params: PricingParams): PricingResult {
  const rate = Math.max(0, params.defaultHourlyRate || 30000);
  const otRate = Math.max(0, params.overtimeRatePerHour ?? rate);
  const freeHours = Math.max(0, params.golfFreeHours ?? 3);

  const durationHours = calculateDurationHours(params.expectedIn, params.expectedOut);
  
  // Base amount for the requested window
  // If the booking is under standard single-session length (<= 3h), flat 30.000 đ or per-hour rate
  const baseAmount = durationHours <= 3 ? rate : durationHours * (rate / 2);

  let sponsoredAmount = 0;
  let customerPay = baseAmount;
  let feePayer: 'customer' | 'gopick_sponsored' | 'split' = 'customer';

  if (params.isGolfSponsored) {
    if (durationHours <= freeHours) {
      // 100% sponsored by GoPick
      sponsoredAmount = baseAmount;
      customerPay = 0;
      feePayer = 'gopick_sponsored';
    } else {
      // Partially sponsored for the first freeHours
      sponsoredAmount = rate;
      customerPay = Math.max(0, baseAmount - sponsoredAmount);
      feePayer = 'split';
    }
  }

  // Check actual overtime at gate checkout
  let overtimeHours = 0;
  let overtimeAmount = 0;
  if (params.actualOut && params.actualOut > params.expectedOut + 15 * 60 * 1000) {
    // 15-minute grace period exceeded
    const extraMs = params.actualOut - params.expectedOut;
    overtimeHours = Math.ceil(extraMs / (1000 * 60 * 60));
    overtimeAmount = overtimeHours * otRate;
  }

  const finalTotal = baseAmount + overtimeAmount;

  return {
    durationHours,
    baseAmount: Math.round(baseAmount),
    sponsoredAmount: Math.round(sponsoredAmount),
    customerPay: Math.round(customerPay),
    feePayer,
    overtimeHours,
    overtimeAmount: Math.round(overtimeAmount),
    finalTotal: Math.round(finalTotal),
  };
}
