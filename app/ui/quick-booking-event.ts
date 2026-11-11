export const QUICK_BOOKING_EVENT = 'golf3d:quick-booking';

export type QuickBookingSelection = {
  service: 'gdr' | '9' | '18';
  vip: boolean;
  start: string;
  notice: string;
};
