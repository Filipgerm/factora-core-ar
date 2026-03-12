/**
 * Customer lookup and utility functions
 */

import { CUSTOMERS_DATA, type Customer } from "@/lib/customers-data";

/**
 * Find a customer by VAT number (case-insensitive)
 */
export function findCustomerByVat(vatNumber: string): Customer | undefined {
  return CUSTOMERS_DATA.find(
    (customer) => customer.vatNumber.toLowerCase() === vatNumber.toLowerCase()
  );
}

