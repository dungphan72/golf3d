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
  (p) => p !== 'data.export' && p !== 'coach.own' && p !== 'legacy.approve',
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
    'fnb.order',
    'fnb.kitchen',
    'member.view',
    'member.sell',
    'crm.view',
    'crm.work',
    'coach.view',
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

export const can = (role: Role, permission: Permission) => GRANTS[role].includes(permission);
export const permissionsOf = (role: Role): Permission[] => [...GRANTS[role]];

/** Managers may manage staff but never create, change or remove owners. */
export function canAssignRole(actor: Role, target: Role) {
  if (!can(actor, 'staff.manage')) return false;
  // Only the owner creates, edits or resets managers and other owners; a manager handles the staff below.
  return actor === 'owner' || (target !== 'owner' && target !== 'manager');
}
