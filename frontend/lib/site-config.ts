// Site-wide configuration
export const SITE_CONFIG = {
  // Change this password to your desired site password
  PASSWORD: "@factora2025*",

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
