export interface Customer {
  id: number;
  name: string;
  country: string;
  businessName: string;
  vatNumber: string;
  dateShared: string;
  status: "new" | "onboarded" | "pending";
  assignedRep?: string;
  alertsEnabled?: boolean;
  paymentTerms: "Prepaid" | "Net 15" | "Net 30" | "Net 60";
  connectedServices: {
    bank: boolean;
    erp: boolean;
    ecommerce?: boolean;
    bankName?: string;
    erpName?: string;
    ecommerceName?: string;
  };
  creditScore?: number; // Overall credit score (average of sub-scores, 300-850)
  creditScores?: {
    bank?: number; // Bank sub-score (300-850)
    erp?: number; // ERP sub-score (300-850)
    socialMedia?: number; // Social media sub-score (300-850)
    ecommerce?: number; // E-commerce sub-score (300-850)
  };
}

// Helper function to generate deterministic random number based on seed
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const SALES_REPS = [
  "Hannah Brooks",
  "Marco Silva",
  "Ava Chen",
  "Theo Martin",
  "Nadia Petrova",
  "Omar Haddad",
  "Isabella Costa",
];

const assignSalesRep = (vatNumber: string, id: number): string => {
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const seed = vatNumeric + id * 17;
  const index = Math.floor(seededRandom(seed) * SALES_REPS.length);
  return SALES_REPS[index] || SALES_REPS[0];
};

// Generate bank sub-score (300-850) based on VAT and ID
const generateBankScore = (vatNumber: string, id: number): number => {
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const seed = (vatNumeric + id) * 23;
  const random = seededRandom(seed);
  // return Math.floor(300 + random * 550); // Range: 300-850
  return 785;
};

// Generate ERP sub-score (300-850) based on VAT and ID
const generateERPScore = (vatNumber: string, id: number): number => {
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const seed = (vatNumeric + id) * 31;
  const random = seededRandom(seed);
  // return Math.floor(300 + random * 550); // Range: 300-850
  return 698;
};

// Generate social media sub-score (300-850) based on VAT and ID
const generateSocialMediaScore = (vatNumber: string, id: number): number => {
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const seed = (vatNumeric + id) * 41;
  const random = seededRandom(seed);
  // return Math.floor(300 + random * 550); // Range: 300-850
  return 743;
};

// Generate e-commerce sub-score (300-850) based on VAT and ID
const generateEcommerceScore = (vatNumber: string, id: number): number => {
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const seed = (vatNumeric + id) * 53;
  const random = seededRandom(seed);
  // return Math.floor(300 + random * 550); // Range: 300-850
  return 712;
};

// Generate credit scores for a customer
const generateCreditScores = (
  customer: Omit<Customer, "creditScore" | "creditScores">,
): {
  creditScore: number;
  creditScores: {
    bank?: number;
    erp?: number;
    socialMedia: number;
    ecommerce?: number;
  };
} => {
  const creditScores: {
    bank?: number;
    erp?: number;
    socialMedia: number;
    ecommerce?: number;
  } = {
    socialMedia: generateSocialMediaScore(customer.vatNumber, customer.id),
  };

  if (customer.connectedServices.bank) {
    creditScores.bank = generateBankScore(customer.vatNumber, customer.id);
  }

  if (customer.connectedServices.erp) {
    creditScores.erp = generateERPScore(customer.vatNumber, customer.id);
  }

  if (customer.connectedServices.ecommerce) {
    creditScores.ecommerce = generateEcommerceScore(
      customer.vatNumber,
      customer.id,
    );
  }

  // Calculate overall score as average of available sub-scores
  const scores = [
    creditScores.bank,
    creditScores.erp,
    creditScores.socialMedia,
    creditScores.ecommerce,
  ].filter((score): score is number => score !== undefined);
  const creditScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length,
  );

  return { creditScore, creditScores };
};

// Available e-commerce platforms
const ECOMMERCE_PLATFORMS = ["WooCommerce", "Shopify", "Magento"];

// Assign e-commerce platform deterministically based on VAT and ID
const assignEcommercePlatform = (vat: string, id: number): string => {
  const vatNumber = parseInt(vat.replace(/\D/g, ""), 10) || 0;
  const seed = (vatNumber + id) * 47; // Use different multiplier for platform assignment
  const random = seededRandom(seed);
  const index = Math.floor(random * ECOMMERCE_PLATFORMS.length);
  return ECOMMERCE_PLATFORMS[index];
};

// Load raw customer data from JSON file
import customersDataRaw from "./data/customers-data.json";

// Apply transformations to add credit scores and e-commerce platforms
export const CUSTOMERS_DATA: Customer[] = (
  customersDataRaw as Omit<Customer, "creditScore" | "creditScores">[]
).map((customer): Customer => {
  // Assign e-commerce platform to onboarded customers first
  const customerTyped = customer as Customer;
  let customerWithPlatform: Customer = { ...customerTyped };
  if (customerTyped.status === "onboarded") {
    const platformName = assignEcommercePlatform(
      customerTyped.vatNumber,
      customerTyped.id,
    );
    customerWithPlatform.connectedServices = {
      ...customerTyped.connectedServices,
      ecommerce: true,
      ecommerceName: platformName,
    };
  }

  // Generate credit scores after platform assignment
  const scores = generateCreditScores(customerWithPlatform);
  const assignedRep = assignSalesRep(
    customerWithPlatform.vatNumber,
    customerWithPlatform.id,
  );
  const updatedCustomer: Customer = {
    ...customerWithPlatform,
    creditScore: scores.creditScore,
    creditScores: scores.creditScores,
    assignedRep,
  };

  return updatedCustomer;
});

export const getCustomersByStatus = (status: Customer["status"]) =>
  CUSTOMERS_DATA.filter((customer) => customer.status === status);

export const searchCustomers = (customers: Customer[], searchTerm: string) =>
  customers.filter(
    (customer) =>
      searchTerm === "" ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.vatNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

export const sortCustomers = (
  customers: Customer[],
  sortBy: "businessName" | "dateShared",
  sortOrder: "asc" | "desc",
) => {
  return [...customers].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortBy === "businessName") {
      aValue = a.businessName.toLowerCase();
      bValue = b.businessName.toLowerCase();
    } else {
      aValue = new Date(a.dateShared).getTime();
      bValue = new Date(b.dateShared).getTime();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};
