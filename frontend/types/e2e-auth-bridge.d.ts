/**
 * Injected by Playwright `installE2EAuth`; read only when the E2E auth bridge is enabled
 * (non-production builds, or production with NEXT_PUBLIC_ENABLE_E2E_AUTH_BRIDGE=true).
 */
export {};

declare global {
  interface Window {
    __E2E_AUTH__?: {
      token: string;
      profile: {
        user_id: string;
        username: string;
        email: string;
        role: string;
        organization_id: string | null;
        email_verified: boolean;
        phone_verified: boolean;
      };
    };
  }
}
