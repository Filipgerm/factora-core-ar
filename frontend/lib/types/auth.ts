export type UserType = "buyer" | "supplier" | "financial_institution";

export interface UserSession {
  userId: string;
  userType: UserType;
  email?: string;
  iat: number; // Issued at timestamp
}

export interface AuthToken {
  token: string; // Mock JWT token string
  payload: UserSession;
}

export interface SignInCredentials {
  username?: string;
  password?: string;
  email?: string;
}

