import type { Segment } from './club.ts';

/**
 * How a prepaid package is used up.
 *  - Hourly (GDR) packages are charged in hours of actual play, rounded up with a 5-minute grace
 *    (62 minutes = 2 hours, 64 minutes = 1 hour), never less than 1.
 *  - 9/18-hole packages are charged one round per session.
 *  - A package bought for the standard room cannot pay for a VIP room; a VIP package may pay for
 *    either; "any" (older packages) works everywhere.
 */
export type PackageRoom = 'any' | 'standard' | 'vip';
export const PACKAGE_ROOM_LABELS: Record<PackageRoom, string> = {
  any: 'Tất cả phòng',
  standard: 'Phòng tiêu chuẩn',
  vip: 'Phòng VIP',
};

export const GRACE_MINUTES = 5;
export const playedMinutes = (segments: Segment[]) =>
  segments.reduce((n, s) => n + Math.max(0, s.end - s.start) / 60_000, 0);

export const hoursUsed = (minutes: number) =>
  Math.max(1, Math.ceil((minutes - GRACE_MINUTES) / 60));

/** Units to take from the package for a finished session of this service. */
export const unitsForSession = (service: string, segments: Segment[]) =>
  service === 'gdr' ? hoursUsed(playedMinutes(segments)) : 1;

export const isVipRoom = (roomId: string) => roomId.startsWith('vip');
export const roomAllows = (packageRoom: string, roomId: string) =>
  packageRoom === 'standard' ? !isVipRoom(roomId) : true;
