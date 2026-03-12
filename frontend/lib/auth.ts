import type {
  UserType,
  UserSession,
  AuthToken,
  SignInCredentials,
} from "./types/auth";
import { encodeToken, decodeToken } from "./auth-utils";

/**
 * Authentication service abstraction layer
 * 
 * Currently uses localStorage to mimic server-side JWT sessions.
 * When connecting to backend, replace localStorage operations with API calls:
 * - signIn() -> POST /api/auth/signin
 * - getSession() -> GET /api/auth/session or decode JWT from httpOnly cookie
 * - updateUserType() -> PATCH /api/auth/user-type
 * - signOut() -> POST /api/auth/signout
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_SESSION: "auth_session",
  // Legacy key for migration
  LEGACY_USER_TYPE: "userType",
} as const;

/**
 * Signs in a user and creates a session
 * 
 * TODO: Replace with API call: POST /api/auth/signin
 * Expected response: { token: string, user: UserSession }
 */
export async function signIn(
  credentials: SignInCredentials,
  userType: UserType
): Promise<AuthToken> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const session: UserSession = {
    userId: generateUserId(),
    userType,
    email: credentials.email || credentials.username || undefined,
    iat: Date.now(),
  };

  const token = encodeToken(session);

  // Store in localStorage (mimics storing JWT in httpOnly cookie)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  }

  return {
    token,
    payload: session,
  };
}

/**
 * Migrates legacy userType from localStorage to new auth system
 * This ensures backward compatibility with existing users
 */
function migrateLegacyUserType(): UserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const legacyUserType = localStorage.getItem(STORAGE_KEYS.LEGACY_USER_TYPE);
  if (
    legacyUserType &&
    (legacyUserType === "buyer" ||
      legacyUserType === "supplier" ||
      legacyUserType === "financial_institution")
  ) {
    // Create a session from legacy userType
    const session: UserSession = {
      userId: generateUserId(),
      userType: legacyUserType as UserType,
      iat: Date.now(),
    };

    const token = encodeToken(session);

    // Store in new format
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));

    // Remove legacy key
    localStorage.removeItem(STORAGE_KEYS.LEGACY_USER_TYPE);

    return session;
  }

  return null;
}

/**
 * Retrieves the current user session
 * 
 * TODO: Replace with API call: GET /api/auth/session
 * Or decode JWT from httpOnly cookie on server-side
 */
export function getSession(): UserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Try to get from stored session first (faster)
  const storedSession = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession) as UserSession;
      // Validate session structure
      if (session.userId && session.userType && session.iat) {
        return session;
      }
    } catch (error) {
      // Invalid JSON, fall through to token decoding
    }
  }

  // Fallback: decode from token
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    const decoded = decodeToken(token);
    if (decoded) {
      // Update stored session for faster access next time
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(decoded));
      return decoded;
    }
  }

  // Migration: try to migrate from legacy userType
  const migratedSession = migrateLegacyUserType();
  if (migratedSession) {
    return migratedSession;
  }

  return null;
}

/**
 * Updates the user type in the current session
 * 
 * TODO: Replace with API call: PATCH /api/auth/user-type
 * Expected request: { userType: UserType }
 */
export async function updateUserType(
  newUserType: UserType
): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  const currentSession = getSession();
  if (!currentSession) {
    throw new Error("No active session found");
  }

  const updatedSession: UserSession = {
    ...currentSession,
    userType: newUserType,
    iat: Date.now(), // Update issued at time
  };

  const token = encodeToken(updatedSession);

  // Update localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(
      STORAGE_KEYS.AUTH_SESSION,
      JSON.stringify(updatedSession)
    );
  }
}

/**
 * Signs out the current user
 * 
 * TODO: Replace with API call: POST /api/auth/signout
 */
export function signOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
}

/**
 * Checks if a user is currently authenticated
 */
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

/**
 * Generates a mock user ID
 * TODO: Remove when backend provides real user IDs
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

