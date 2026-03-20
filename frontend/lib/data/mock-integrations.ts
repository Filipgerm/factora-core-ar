/**
 * Mock data for the Data Ingestion & Integrations hub.
 * Used for UI visualization before FastAPI backend connection.
 */

export interface IntegrationService {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  connected: boolean;
  lastSync?: string;
}

export const MOCK_INTEGRATION_SERVICES: IntegrationService[] = [
  {
    id: "gmail",
    name: "Gmail SDK",
    description: "Extract invoices from email bodies and PDF attachments",
    icon: "Mail",
    connected: true,
    lastSync: "2 min ago",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Two-way sync with your spreadsheets",
    icon: "Sheet",
    connected: true,
    lastSync: "5 min ago",
  },
  {
    id: "saltedge",
    name: "SaltEdge",
    description: "Open Banking — account and transaction aggregation",
    icon: "Landmark",
    connected: true,
    lastSync: "1 hour ago",
  },
  {
    id: "aade-mydata",
    name: "AADE / myDATA",
    description: "Greek Tax Authority — invoice sync and compliance",
    icon: "FileCheck",
    connected: true,
    lastSync: "30 min ago",
  },
  {
    id: "gemi",
    name: "GEMI",
    description: "Greek Business Registry — company document lookup",
    icon: "Building2",
    connected: false,
  },
];
