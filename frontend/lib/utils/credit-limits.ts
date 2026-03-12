// Credit limit range: 30,000 to 100,000 with steps of 10,000 (for top customers)
export const CREDIT_LIMIT_MIN = 30000;
export const CREDIT_LIMIT_MAX = 100000;
export const CREDIT_LIMIT_STEP = 10000;

// Generate credit limit options array
const generateCreditLimitOptions = (): number[] => {
  const options: number[] = [];
  for (
    let limit = CREDIT_LIMIT_MIN;
    limit <= CREDIT_LIMIT_MAX;
    limit += CREDIT_LIMIT_STEP
  ) {
    options.push(limit);
  }
  return options;
};

export const CREDIT_LIMIT_OPTIONS = generateCreditLimitOptions();


// Assign credit limit based on VAT number (deterministic)
export const assignCreditLimit = (vat: string): number => {
  // Special case: Kaminaris gets 200,000 euros
  if (vat.toUpperCase() === "EL123456789") {
    return 200000;
  }
  // Convert VAT to number for deterministic assignment
  const vatNumber = parseInt(vat.replace(/\D/g, ""), 10) || 0;
  // Use modulo to select one of the credit limit options
  const index = vatNumber % CREDIT_LIMIT_OPTIONS.length;
  return CREDIT_LIMIT_OPTIONS[index];
};

