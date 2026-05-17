/**
 * Typed shapes for native clients (documentation + TS consumers).
 * Server responses may include additional fields; clients should ignore unknown keys.
 */

export const MOBILE_API_CONTRACT_VERSION = "1.0.0" as const;

export type StaffTokenBundle = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export type NativeLoginSuccess = {
  success: true;
  data: Record<string, unknown>;
  tokens: StaffTokenBundle;
};

export type NativeRefreshSuccess = {
  success: true;
  tokens: StaffTokenBundle;
};
