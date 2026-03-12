export interface CreditLimitRequest {
  id: string;
  vatNumber: string;
  businessName: string;
  requestType: "credit limit" | "insurance";
  invoiceCount: number;
  totalAmount: number;
  invoiceIds: string[];
  createdAt: string; // ISO string
  providerName?: string; // Bank or insurance company name
  status: "pending" | "approved" | "rejected";
  acceptedAt?: string; // ISO string - when the request was accepted
  acceptedBy?: string; // Business name that accepted the request
  rejectedAt?: string; // ISO string - when the request was rejected
  rejectedBy?: string; // Business name that rejected the request
  archived?: boolean; // Whether the request is archived (approved/rejected requests are archived)
}

const STORAGE_KEY = "factora:creditLimitRequests";

/**
 * Generate a unique ID for a credit limit request
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Store a new credit limit request in sessionStorage
 */
export function storeCreditLimitRequest(
  request: Omit<CreditLimitRequest, "id" | "createdAt" | "status"> & {
    status?: "pending" | "approved" | "rejected";
  }
): CreditLimitRequest {
  if (typeof window === "undefined") {
    throw new Error("sessionStorage is only available in the browser");
  }

  try {
    const existingRequests = getAllCreditLimitRequests();
    const newRequest: CreditLimitRequest = {
      ...request,
      id: generateRequestId(),
      createdAt: new Date().toISOString(),
      status: request.status || "pending",
      archived: false, // New requests are not archived
    };

    const updatedRequests = [...existingRequests, newRequest];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("creditLimitRequestCreated", {
        detail: newRequest,
      })
    );

    return newRequest;
  } catch (error) {
    console.error("Failed to store credit limit request:", error);
    throw error;
  }
}

/**
 * Retrieve all credit limit requests from sessionStorage (internal function that includes archived)
 */
function getAllCreditLimitRequests(): CreditLimitRequest[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((req): req is CreditLimitRequest => {
        return (
          req &&
          typeof req.id === "string" &&
          typeof req.vatNumber === "string" &&
          typeof req.businessName === "string" &&
          (req.requestType === "credit limit" ||
            req.requestType === "insurance") &&
          typeof req.invoiceCount === "number" &&
          typeof req.totalAmount === "number" &&
          Array.isArray(req.invoiceIds) &&
          typeof req.createdAt === "string" &&
          (req.status === "pending" ||
            req.status === "approved" ||
            req.status === "rejected")
        );
      })
      .map((req) => ({
        ...req,
        status: req.status || "pending", // Ensure status exists for legacy requests
        archived: req.archived || false, // Ensure archived field exists for legacy requests
      }));
  } catch (error) {
    console.error("Failed to retrieve credit limit requests:", error);
    return [];
  }
}

/**
 * Retrieve credit limit requests from sessionStorage
 * @param includeArchived - If true, includes archived requests. Defaults to false.
 */
export function getCreditLimitRequests(
  includeArchived: boolean = false
): CreditLimitRequest[] {
  const allRequests = getAllCreditLimitRequests();
  
  if (includeArchived) {
    return allRequests;
  }
  
  // Filter out archived requests by default
  return allRequests.filter((req) => !req.archived);
}

/**
 * Clear a specific credit limit request by ID
 */
export function clearCreditLimitRequest(requestId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const existingRequests = getAllCreditLimitRequests();
    const filtered = existingRequests.filter((req) => req.id !== requestId);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Failed to clear credit limit request:", error);
    return false;
  }
}

/**
 * Clear all credit limit requests
 */
export function clearAllCreditLimitRequests(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear all credit limit requests:", error);
    return false;
  }
}

/**
 * Mark a credit limit request as accepted
 */
export function acceptCreditLimitRequest(
  requestId: string,
  acceptedBy: string
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const existingRequests = getAllCreditLimitRequests();
    const requestIndex = existingRequests.findIndex(
      (req) => req.id === requestId
    );

    if (requestIndex === -1) {
      console.error("Credit limit request not found:", requestId);
      return false;
    }

    const updatedRequests = [...existingRequests];
    updatedRequests[requestIndex] = {
      ...updatedRequests[requestIndex],
      status: "approved",
      acceptedAt: new Date().toISOString(),
      acceptedBy,
      archived: false, // Keep request visible
      // Clear rejection fields if they exist
      rejectedAt: undefined,
      rejectedBy: undefined,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("creditLimitRequestAccepted", {
        detail: updatedRequests[requestIndex],
      })
    );

    return true;
  } catch (error) {
    console.error("Failed to accept credit limit request:", error);
    return false;
  }
}

/**
 * Mark a credit limit request as rejected
 */
export function rejectCreditLimitRequest(
  requestId: string,
  rejectedBy: string
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const existingRequests = getAllCreditLimitRequests();
    const requestIndex = existingRequests.findIndex(
      (req) => req.id === requestId
    );

    if (requestIndex === -1) {
      console.error("Credit limit request not found:", requestId);
      return false;
    }

    const updatedRequests = [...existingRequests];
    updatedRequests[requestIndex] = {
      ...updatedRequests[requestIndex],
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy,
      archived: false, // Keep request visible
      // Clear acceptance fields if they exist
      acceptedAt: undefined,
      acceptedBy: undefined,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("creditLimitRequestRejected", {
        detail: updatedRequests[requestIndex],
      })
    );

    return true;
  } catch (error) {
    console.error("Failed to reject credit limit request:", error);
    return false;
  }
}
