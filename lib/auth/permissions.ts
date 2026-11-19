export const ROLES = ['owner', 'manager', 'cashier', 'coach', 'cskh', 'sale'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'view',
  'booking.create',
  'booking.cancel',
  'session.operate',
  'support.handle',
  'finance.view',
  'finance.operate',
  'finance.shift',
  'billing.discount',
  'billing.refund',
  'menu.manage',
  'fnb.order',
  'fnb.kitchen',
  'stock.manage',
  'settings.manage',
  'staff.manage',
  'member.view',
  'member.sell',
  'member.adjust',
  'crm.view',
  'crm.work',
  'crm.manage',
  'coach.view',
  'coach.schedule',
  'coach.manage',
  'coach.own',
  'data.export',
  // Old (pre-system) bills: staff type them in, only the owner approves.
  'legacy.enter',
  'legacy.approve',
  // Tournament scores: staff enter them, only the owner confirms scores golfers entered themselves.
  'tournament.score',
  'tournament.approve',
  // Parking module: view spots/schedule, gate check-in/out, full management & reconciliation.
  'parking.view',
  'parking.gate',
  'parking.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Chủ cơ sở',
  manager: 'Quản lý',
  cashier: 'Thu ngân',
  coach: 'HLV',
  cskh: 'CSKH',
  sale: 'Sale',
};

const MANAGER = PERMISSIONS.filter(
  (p) =>
    p !== 'data.export' &&
    p !== 'coach.own' &&
    p !== 'legacy.approve' &&
    p !== 'tournament.approve',
);
const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: MANAGER,
  cashier: [
    'view',
    'booking.create',
    'booking.cancel',
    'session.operate',
    'support.handle',
    'finance.view',
    'finance.operate',
    'finance.shift',
    'legacy.enter',
    'tournament.score',
    'fnb.order',
    'fnb.kitchen',
    'member.view',
    'member.sell',
    'crm.view',
    'crm.work',
    'coach.view',
    'parking.view',
    'parking.gate',
  ],
  coach: ['view', 'support.handle', 'member.view', 'coach.view', 'coach.own'],
  cskh: [
    'view',
    'booking.create',
    'booking.cancel',
    'support.handle',
    'fnb.order',
    'member.view',
    'member.sell',
    'crm.view',
    'crm.work',
    'coach.view',
    'coach.schedule',
    'parking.view',
    'parking.gate',
  ],
  sale: [
    'view',
    'booking.create',
    'member.view',
    'member.sell',
    'crm.view',
    'crm.work',
    'coach.view',
    'coach.schedule',
  ],
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export type PermissionActor = { role: Role; permissions?: readonly Permission[] };

/** Missing profile inherits the role; an empty profile deliberately grants nothing. */
export const permissionsOf = (subject: Role | PermissionActor): Permission[] => {
  const role = typeof subject === 'string' ? subject : subject.role;
  if (role === 'owner') return [...PERMISSIONS];
  return [...(typeof subject === 'string' ? GRANTS[role] : subject.permissions ?? GRANTS[role])];
};
export const can = (subject: Role | PermissionActor, permission: Permission) =>
  permissionsOf(subject).includes(permission);

/** Corrupt persisted profiles fail closed rather than silently restoring the role. */
export function parsePermissions(value: string | null | undefined): Permission[] | undefined {
  if (value == null) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return PERMISSIONS.filter((p) => parsed.includes(p));
  } catch { return []; }
}

/** Managers may manage staff but never create, change or remove owners. */
export function canAssignRole(actor: Role | PermissionActor, target: Role) {
  if (!can(actor, 'staff.manage')) return false;
  // Only the owner creates, edits or resets managers and other owners; a manager handles the staff below.
  const role = typeof actor === 'string' ? actor : actor.role;
  return role === 'owner' || (
    target !== 'owner' && target !== 'manager' &&
    permissionsOf(target).every((p) => can(actor, p))
  );
}
