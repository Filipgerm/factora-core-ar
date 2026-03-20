export type UserType = "buyer" | "supplier" | "financial_institution";

export interface UserSession {
  userId: string;
  userType: UserType;
  email?: string;
  iat: number;
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
