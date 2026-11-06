/** The service a customer asked for, as the old CRM stored it ('swing', '9', ...), in words staff read. Pure. */
const SERVICES: Record<string, string> = {
  swing: 'Luyện swing',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
  group: 'Nhóm / sự kiện',
};

/** '' for anything unknown, including 'other' and the empty guess. */
export const serviceOf = (need: string | undefined) => SERVICES[need ?? ''] ?? '';
export const isService = (need: string | undefined) => Boolean(SERVICES[need ?? '']);
