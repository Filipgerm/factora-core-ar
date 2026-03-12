import { Invoice, RequestStatus } from "./invoice-types";
import { customersAndSuppliers } from "@/components/simple-customers-content";

// Helper function to generate deterministic random number based on seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate invoices for a customer with status "onboarded"
export function generateInvoicesForCustomer(
  vatNumber: string,
  customerId?: number,
  count: number = 20
): Invoice[] {
  const invoices: Invoice[] = [];
  const statuses: Invoice["status"][] = [
    "Paid",
    "Pending",
    "Defaulted",
    "Draft",
  ];
  // Status distribution: 30% Paid, 40% Pending, 15% Defaulted, 15% Draft
  const statusDistribution = [
    "Paid",
    "Paid",
    "Paid", // 30%
    "Pending",
    "Pending",
    "Pending",
    "Pending", // 40%
    "Defaulted",
    "Defaulted", // 15%
    "Draft",
    "Draft", // 15%
  ];

  // Get available counterparty VAT numbers (exclude the customer's own VAT)
  const availableCounterpartyVats = customersAndSuppliers
    .map((entry) => entry.vat)
    .filter((vat) => vat.toLowerCase() !== vatNumber.toLowerCase());

  // If no counterparties available, fall back to empty array (shouldn't happen in practice)
  if (availableCounterpartyVats.length === 0) {
    console.warn(`No counterparty VATs available for customer ${vatNumber}`);
  }

  const now = new Date();
  const vatNumeric = parseInt(vatNumber.replace(/\D/g, ""), 10) || 0;
  const idSeed = customerId || vatNumeric;

  for (let i = 0; i < count; i++) {
    // Generate deterministic seed based on VAT number and invoice index
    const seed = (vatNumeric * 1000 + idSeed * 100 + i) * 17;
    const random = seededRandom(seed);

    // Generate date (6-12 months ago)
    const monthsAgo = 6 + Math.floor(random * 6);
    const daysAgo = Math.floor(random * 30);
    const invoiceDate = new Date(now);
    invoiceDate.setMonth(invoiceDate.getMonth() - monthsAgo);
    invoiceDate.setDate(invoiceDate.getDate() - daysAgo);

    // Format date as "MMM DD, YYYY"
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formattedDate = `${
      monthNames[invoiceDate.getMonth()]
    } ${invoiceDate.getDate()}, ${invoiceDate.getFullYear()}`;

    // Generate amount between €1,000 and €30,000
    const amount = Math.floor(1000 + random * 29000);
    const formattedAmount = `€${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    // Select status based on distribution
    const statusIndex = Math.floor((random * 1000) % statusDistribution.length);
    const status = statusDistribution[statusIndex];

    // Select counterparty VAT deterministically based on invoice index
    const counterpartyVatIndex = Math.floor(
      (random * 10000) % availableCounterpartyVats.length
    );
    const counterpartyVat =
      availableCounterpartyVats.length > 0
        ? availableCounterpartyVats[counterpartyVatIndex]
        : undefined;

    // Generate invoice ID
    const invoiceId = `INV-${vatNumber.slice(-6)}-${String(i + 1).padStart(
      3,
      "0"
    )}`;

    invoices.push({
      id: invoiceId,
      created: formattedDate,
      amount: formattedAmount,
      status: status as Invoice["status"],
      requestStatus: "Not Requested",
      vat: counterpartyVat, // Counterparty VAT (the company that issued/received the invoice)
      customerVat: counterpartyVat, // Customer VAT (same as counterparty VAT - generated from customers/suppliers list)
    });
  }

  return invoices;
}

// Get or generate invoices for a customer
export function getInvoicesForCustomer(
  vatNumber: string,
  customerId?: number
): Invoice[] {
  const storageKey = `factora:generatedInvoices:${vatNumber}`;

  if (typeof window === "undefined") {
    // Server-side: generate invoices
    return generateInvoicesForCustomer(vatNumber, customerId);
  }

  try {
    // Check if invoices are already stored
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate stored invoices - check if invoice ID matches the pattern for this customer
        const customerVatSuffix = vatNumber.slice(-6);
        const validInvoices = parsed.filter(
          (inv: any) =>
            inv && inv.id && inv.id.startsWith(`INV-${customerVatSuffix}-`)
        );
        if (validInvoices.length > 0) {
          return validInvoices.map((inv: any) => ({
            id: String(inv.id),
            created: String(inv.created),
            amount: String(inv.amount),
            status: inv.status as Invoice["status"],
            requestStatus:
              (inv.requestStatus as RequestStatus) || "Not Requested",
            vat: inv.vat ? String(inv.vat) : undefined,
            // Ensure customerVat is always set - use stored value or fall back to vat (counterparty VAT)
            customerVat: inv.customerVat
              ? String(inv.customerVat)
              : inv.vat
              ? String(inv.vat)
              : undefined,
            businessName: inv.businessName
              ? String(inv.businessName)
              : undefined,
          }));
        }
      }
    }

    // Generate new invoices
    const generated = generateInvoicesForCustomer(vatNumber, customerId);

    // Store in sessionStorage
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(generated));
    } catch (error) {
      console.error("Failed to store generated invoices:", error);
    }

    return generated;
  } catch (error) {
    console.error("Failed to get/generate invoices:", error);
    return generateInvoicesForCustomer(vatNumber, customerId);
  }
}

