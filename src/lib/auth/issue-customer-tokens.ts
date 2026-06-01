import {
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth/jwt";
import type { AppRole } from "@/lib/auth/roles";
import {
  pickPrimaryJwtRole,
  resolveCustomerRoles,
  type CustomerCapabilitiesRow,
} from "@/lib/auth/customer-capabilities";

export async function issueCustomerTokens(customer: {
  id: string;
  email: string;
} & CustomerCapabilitiesRow): Promise<{ accessToken: string; refreshToken: string; roles: AppRole[]; primaryRole: AppRole }> {
  const roles = resolveCustomerRoles(customer);
  const primaryRole = pickPrimaryJwtRole(roles);
  const base = { userId: customer.id, email: customer.email, role: primaryRole, roles };
  const accessToken = await createAccessToken(base);
  const refreshToken = await createRefreshToken(base);
  return { accessToken, refreshToken, roles, primaryRole };
}
