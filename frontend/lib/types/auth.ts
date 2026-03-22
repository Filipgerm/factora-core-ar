/** Backend RBAC roles from JWT / AuthResponse */
export type BackendUserRole =
  | "owner"
  | "admin"
  | "external_accountant"
  | "viewer"
  | (string & {});

/**
 * @deprecated Legacy demo "persona" — no direct backend equivalent.
 * Map from `BackendUserRole` in UI when needed, or remove call sites.
 */
export type UserType = "buyer" | "supplier" | "financial_institution";

export interface UserSession {
  userId: string;
  username: string;
  email?: string;
  role: BackendUserRole;
  organizationId: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  /** Legacy mock-token field; real API sessions use stored profile + JWT separately */
  iat?: number;
  /** @deprecated Legacy mock persona — not set by backend auth */
  userType?: UserType;
}

export interface AuthToken {
  token: string;
  payload: UserSession;
}

export interface SignInCredentials {
  username?: string;
  email?: string;
  password?: string;
}
