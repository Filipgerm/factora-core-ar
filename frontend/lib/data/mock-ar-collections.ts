/**
 * Mock data for the AR Collections Agent view.
 * Used for UI visualization before FastAPI backend connection.
 */

export interface OverdueInvoice {
  id: string;
  customerName: string;
  invoiceId: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  lastNudge?: string;
  aiDraftedEmail: {
    subject: string;
    body: string;
  };
}

export const MOCK_OVERDUE_INVOICES: OverdueInvoice[] = [
  {
    id: "ar-1",
    customerName: "Alpha Technologies SA",
    invoiceId: "INV-001",
    amount: 12500,
    currency: "EUR",
    dueDate: "2026-02-28",
    daysOverdue: 20,
    lastNudge: "2026-03-10",
    aiDraftedEmail: {
      subject: "Friendly reminder: Invoice INV-001 (€12,500.00) overdue",
      body: `Dear Alpha Technologies team,

I hope this message finds you well. I'm writing to follow up on invoice INV-001 for €12,500.00, which was due on February 28, 2026.

We understand that payment processing can sometimes take longer than expected. If you've already sent the payment, please disregard this message. Otherwise, we'd appreciate it if you could process the payment at your earliest convenience.

If you have any questions or need to discuss payment terms, please don't hesitate to reach out.

Best regards,
Factora Finance Team`,
    },
  },
  {
    id: "ar-2",
    customerName: "Delta Logistics AE",
    invoiceId: "INV-004",
    amount: 5600,
    currency: "EUR",
    dueDate: "2026-03-05",
    daysOverdue: 14,
    lastNudge: undefined,
    aiDraftedEmail: {
      subject: "Reminder: Invoice INV-004 (€5,600.00) — payment overdue",
      body: `Dear Delta Logistics team,

This is a friendly reminder that invoice INV-004 for €5,600.00 was due on March 5, 2026. We haven't yet received payment for this invoice.

Could you please confirm when we can expect the payment? If there are any issues on your end, we're happy to work with you to find a solution.

Thank you for your business.

Best regards,
Factora Finance Team`,
    },
  },
  {
    id: "ar-3",
    customerName: "Gamma Industries GmbH",
    invoiceId: "INV-003",
    amount: 22000,
    currency: "EUR",
    dueDate: "2026-03-01",
    daysOverdue: 18,
    lastNudge: "2026-03-12",
    aiDraftedEmail: {
      subject: "Second reminder: Invoice INV-003 (€22,000.00)",
      body: `Dear Gamma Industries team,

We previously reached out regarding invoice INV-003 for €22,000.00, which was due on March 1, 2026. As we haven't received payment yet, we're sending a second reminder.

Please arrange for payment at your earliest convenience. If you've already paid, please share the payment reference so we can reconcile our records.

We value our partnership and are here to help if you need any assistance.

Best regards,
Factora Finance Team`,
    },
  },
];
