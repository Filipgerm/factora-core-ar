# Site-Wide Password Protection

This website is now protected with a site-wide password system. Users must enter a password before accessing any part of the website.

## How It Works

1. **Password Prompt**: When users visit any page, they'll see a password prompt instead of the actual content
2. **Session Management**: Once authenticated, users stay logged in for 24 hours (configurable)
3. **Logout Option**: A logout button appears in the top-right corner for easy access
4. **Automatic Expiry**: Sessions automatically expire after the configured duration.

## Configuration

To change the password or customize the prompt, edit the file `lib/site-config.ts`:

```typescript
export const SITE_CONFIG = {
  // Change this password to your desired site password
  PASSWORD: "your-secure-password-here",

  // Customize the password prompt
  PASSWORD_PROMPT: {
    title: "Welcome to Factora",
    description:
      "This website is password protected. Please enter the access password to continue.",
  },

  // Session settings
  SESSION: {
    // How long the session should last (in milliseconds)
    // 24 hours = 24 * 60 * 60 * 1000
    duration: 24 * 60 * 60 * 1000,

    // Storage key for the authentication status
    storageKey: "site-authenticated",
  },
} as const;
```

## Security Features

- **Client-side Protection**: Password is stored in the component (not in environment variables for simplicity)
- **Session Expiry**: Automatic logout after 24 hours
- **Local Storage**: Authentication status is stored in browser's localStorage
- **Password Visibility Toggle**: Users can show/hide the password while typing
- **Error Handling**: Clear error messages for incorrect passwords

## Implementation Details

The password protection is implemented at the root layout level (`app/layout.tsx`), which means it protects the entire website. The component `SitePasswordProtection` wraps all content and only renders the actual website content after successful authentication.

## Files Modified

- `app/layout.tsx` - Added password protection wrapper
- `components/site-password-protection.tsx` - Main password protection component
- `lib/site-config.ts` - Configuration file for password and settings

## Usage

1. Change the password in `lib/site-config.ts`
2. Customize the title and description if desired
3. Deploy your website
4. Users will be prompted for the password on their first visit
5. After entering the correct password, they can access the full website
6. The session persists for 24 hours (configurable)

## Notes

- The password is currently stored in the client-side code. For production use, consider implementing server-side authentication
- The current implementation uses localStorage, so clearing browser data will require re-authentication
- The logout button is always visible in the top-right corner when authenticated
