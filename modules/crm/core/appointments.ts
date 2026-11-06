/** Experience appointments: states and who may approve. */
export const APPT_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'] as const;
export type ApptStatus = (typeof APPT_STATUSES)[number];
export const APPT_LABELS: Record<ApptStatus, string> = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  ARRIVED: 'Khách đã đến',
  NO_SHOW: 'Khách không đến',
  CANCELLED: 'Đã hủy',
};
const NEXT: Record<ApptStatus, readonly ApptStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
  ARRIVED: [],
  NO_SHOW: ['CONFIRMED'],
  CANCELLED: ['CONFIRMED'],
};
export const canTransition = (from: ApptStatus, to: ApptStatus) => NEXT[from].includes(to);

export type Viewer = { id: string; manager: boolean; leader?: boolean; team?: string | null };

export function initialAppointmentStatus(
  requireApproval: boolean,
  creatorIsManager: boolean,
): ApptStatus {
  if (creatorIsManager) return 'CONFIRMED';
  return requireApproval ? 'PENDING' : 'CONFIRMED';
}

export function canApproveAppointment(
  viewer: Viewer,
  appt: { ownerTeam?: string | null; owner?: string | null },
): boolean {
  if (viewer.manager) return true;
  return !!viewer.leader && !!viewer.team && viewer.team === (appt.ownerTeam ?? '');
}

/** Share of booked visits that came: ARRIVED / (ARRIVED + NO_SHOW), in percent with one decimal. */
export function arrivalRate(arrived: number, noShow: number): number {
  const total = arrived + noShow;
  return total ? Math.round((arrived / total) * 1000) / 10 : 0;
}
