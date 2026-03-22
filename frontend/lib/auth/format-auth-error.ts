import { isApiError } from "@/lib/api/types";

/** User-facing copy for failed login (wrong credentials vs other errors). */
export function formatLoginError(err: unknown): string {
  if (isApiError(err)) {
    if (err.status === 401) {
      return "The email or password you entered doesn't match our records. Check for typos, caps lock, or try signing in another way.";
    }
    if (err.message.trim()) return err.message;
  }
  return "We couldn't complete sign-in. Please wait a moment and try again.";
}

/** User-facing copy for failed signup (validation, duplicate email, etc.). */
export function formatSignupError(err: unknown): string {
  if (isApiError(err) && err.message.trim()) {
    return err.message;
  }
  return "We couldn't create your account right now. Please try again shortly.";
}
