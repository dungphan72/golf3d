/**
 * Saigon Indoor Golf (sigolf.vn) — SaaS Multi-Tenant Isolation & Security Guard
 * 
 * Guarantees that every server operation strictly accesses only the authenticated
 * facility (tenant). Cross-tenant data tampering or access is blocked at the gate.
 */

export class TenantAccessError extends Error {
  statusCode: number;
  constructor(message: string = 'Truy cập trái phép: không thể thao tác trên cơ sở khác') {
    super(message);
    this.name = 'TenantAccessError';
    this.statusCode = 403;
  }
}

/**
 * Asserts that the requested tenant matches the authenticated session tenant.
 * Throws TenantAccessError if there is a mismatch.
 */
export function assertTenant(authTenant: string, requestedTenant?: string | null): void {
  if (!authTenant) {
    throw new TenantAccessError('Chưa xác định cơ sở của phiên làm việc');
  }
  if (requestedTenant && requestedTenant !== authTenant) {
    throw new TenantAccessError(
      `Từ chối truy cập: Phiên đăng nhập thuộc cơ sở [${authTenant}], không được thao tác trên [${requestedTenant}]`,
    );
  }
}

/**
 * Sanitizes a payload object by stripping any client-supplied tenant property
 * and forcing the authenticated session tenant.
 */
export function sanitizeTenantPayload<T extends Record<string, unknown>>(
  payload: T,
  authTenant: string,
): T & { tenant: string } {
  assertTenant(authTenant, (payload as { tenant?: string }).tenant);
  return {
    ...payload,
    tenant: authTenant,
  };
}
