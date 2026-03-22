import type { UserSession } from "./types/auth";

/**
 * Mock JWT token encoding/decoding utilities
 * These mimic real JWT behavior but use simple JSON encoding
 * 
 * TODO: When connecting to backend, replace with real JWT library (e.g., jose, jsonwebtoken)
 */

const JWT_HEADER = {
  alg: "HS256",
  typ: "JWT",
};

/**
 * Encodes a UserSession payload into a mock JWT-like token string
 * Format: base64(header).base64(payload).signature
 */
export function encodeToken(payload: UserSession): string {
  const iat = payload.iat ?? Date.now();
  const header = btoa(JSON.stringify(JWT_HEADER));
  const encodedPayload = btoa(JSON.stringify({ ...payload, iat }));
  const signature = btoa(`mock-signature-${payload.userId}-${iat}`);
  
  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Decodes a mock JWT-like token string back to UserSession
 * Returns null if token is invalid or malformed
 */
export function decodeToken(token: string): UserSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const decodedPayload = JSON.parse(atob(parts[1])) as UserSession;
    
    // Basic validation
    if (!decodedPayload.userId || !decodedPayload.role) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

