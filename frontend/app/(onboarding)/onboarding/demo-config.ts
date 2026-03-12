export const ONBOARDING_DEMO_CONFIG = {
  typingSpeed: 50, // milliseconds per character
  delayBetweenActions: 800, // milliseconds between actions
  delayBeforeNextStep: 1500, // milliseconds before moving to next step

  // Demo data for different forms
  demoData: {
    phone: {
      countryCode: "+30", // Greece
      phoneNumber: "6941234567",
    },
    email: {
      email: "demo@example.com",
    },
    business: {
      vatNumber: "123456789",
      gemiNumber: "12345678901234",
    },
    bank: {
      selectedBank: "piraeus",
      username: "demo_user",
      password: "demo_pass",
      selectedAccounts: ["checking", "savings"],
    },
    erp: {
      selectedERP: "entersoftone",
    },
    socialMedia: {
      facebook: "https://facebook.com/acmecorp",
      linkedin: "https://linkedin.com/company/acmecorp",
      instagram: "https://instagram.com/acmecorp",
    },
    kyc: {
      selectedMethod: "device", // "device" | "smartphone"
    },
  },
};

// Helper functions for demo simulation
export const simulateTyping = (
  setValue: (value: string) => void,
  text: string,
  speed: number = ONBOARDING_DEMO_CONFIG.typingSpeed
): Promise<void> => {
  return new Promise((resolve) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setValue(text.substring(0, index));
        index++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
