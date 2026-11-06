import type { Stage } from './stages.ts';

/** Call results and what each one does to the pipeline. */
export const CALL_RESULTS = [
  'NO_ANSWER',
  'THINKING',
  'INTERESTED',
  'APPOINTMENT',
  'NOT_MET',
  'MET',
  'WRONG_NUMBER',
  'NOT_INTERESTED',
] as const;
export type CallResult = (typeof CALL_RESULTS)[number];
export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  NO_ANSWER: 'Không nghe máy / Máy bận / Thuê bao',
  THINKING: 'Khách cần suy nghĩ thêm',
  INTERESTED: 'Có nhu cầu, cần tư vấn tiếp',
  APPOINTMENT: 'Hẹn đến trải nghiệm',
  NOT_MET: 'Chưa đến được (dời lịch)',
  MET: 'Đã gặp khách',
  WRONG_NUMBER: 'Sai số',
  NOT_INTERESTED: 'Không có nhu cầu',
};

export const NEXT_ACTIONS = [
  'NEW',
  'RETRY_1',
  'RETRY_2',
  'RETRY_3',
  'CALLBACK',
  'MEETING',
  'FOLLOW_UP',
  'NONE',
] as const;
export type NextAction = (typeof NEXT_ACTIONS)[number];
export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  NEW: 'Khách mới',
  RETRY_1: 'Gọi lại lần 1',
  RETRY_2: 'Gọi lại lần 2',
  RETRY_3: 'Gọi lại lần 3',
  CALLBACK: 'Gọi lại tư vấn tiếp',
  MEETING: 'KH hẹn đến trải nghiệm',
  FOLLOW_UP: 'Chăm sóc sau gặp',
  NONE: '',
};

export type CallRules = {
  retryHours: number[];
  thinkDays: number;
  interestedHours: number;
  metFollowUpHours: number;
};
export const DEFAULT_CALL_RULES: CallRules = {
  retryHours: [2, 24, 48],
  thinkDays: 2,
  interestedHours: 24,
  metFollowUpHours: 24,
};

export type Outcome =
  | { error: string; needsDate?: boolean }
  | {
      stage: Stage | null;
      nextAction: NextAction;
      nextDue: number | null;
      callAttempts: number;
      lostReason: string | null;
      /** The lead goes back to the pool (too many unanswered calls). */
      recall: boolean;
      /** The customer was actually reached. */
      reached: boolean;
    };

const HOUR = 3_600_000;
const GRACE = 5 * 60_000;

export function applyCallResult(
  state: { stage: Stage; callAttempts: number },
  result: string,
  now: number,
  when: number | null | undefined,
  rules: CallRules = DEFAULT_CALL_RULES,
): Outcome {
  const base = { stage: null, lostReason: null, recall: false, reached: true } as const;
  switch (result as CallResult) {
    case 'NO_ANSWER': {
      const attempts = state.callAttempts + 1;
      if (attempts > rules.retryHours.length)
        return {
          ...base,
          reached: false,
          nextAction: 'NONE',
          nextDue: null,
          callAttempts: attempts,
          recall: true,
        };
      return {
        ...base,
        reached: false,
        nextAction: `RETRY_${attempts}` as NextAction,
        nextDue: now + rules.retryHours[attempts - 1] * HOUR,
        callAttempts: attempts,
      };
    }
    case 'THINKING':
      return {
        ...base,
        stage: 'QUALIFIED',
        nextAction: 'CALLBACK',
        nextDue: now + rules.thinkDays * 24 * HOUR,
        callAttempts: 0,
      };
    case 'INTERESTED':
      return {
        ...base,
        stage: 'QUALIFIED',
        nextAction: 'CALLBACK',
        nextDue: now + rules.interestedHours * HOUR,
        callAttempts: 0,
      };
    case 'APPOINTMENT':
    case 'NOT_MET': {
      if (when == null || !Number.isFinite(when))
        return { error: 'Vui lòng chọn ngày giờ hẹn', needsDate: true };
      if (when < now - GRACE) return { error: 'Ngày giờ hẹn phải ở tương lai', needsDate: true };
      return {
        ...base,
        stage: 'VISIT_SCHEDULED',
        nextAction: 'MEETING',
        nextDue: when,
        callAttempts: 0,
      };
    }
    case 'MET':
      return {
        ...base,
        stage: 'VISITED',
        nextAction: 'FOLLOW_UP',
        nextDue: now + rules.metFollowUpHours * HOUR,
        callAttempts: 0,
      };
    case 'WRONG_NUMBER':
      return {
        ...base,
        stage: 'LOST',
        nextAction: 'NONE',
        nextDue: null,
        callAttempts: state.callAttempts,
        lostReason: 'Sai số / số không liên lạc được',
      };
    case 'NOT_INTERESTED':
      return {
        ...base,
        stage: 'LOST',
        nextAction: 'NONE',
        nextDue: null,
        callAttempts: state.callAttempts,
        lostReason: 'Chưa có nhu cầu',
      };
    default:
      return { error: 'Kết quả không hợp lệ' };
  }
}

/** Detailed status shown for a lead after a result: retries get their own "not reached" status. */
export function statusAfterResult(nextAction: NextAction): string | null {
  if (nextAction === 'RETRY_1') return 'chua-lien-lac-1';
  if (nextAction === 'RETRY_2') return 'chua-lien-lac-2';
  if (nextAction === 'RETRY_3') return 'chua-lien-lac-3';
  return null;
}
