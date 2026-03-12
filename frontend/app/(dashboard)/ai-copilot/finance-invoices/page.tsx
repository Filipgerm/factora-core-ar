"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Send,
  Save,
  Calendar,
  User,
  Building,
  Euro,
  FileText,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  vat: number;
  total: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  taxId: string;
  avatar?: string;
}

const MOCK_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Freeman Sporting Goods",
    email: "billing@freemansporting.example",
    address: "789 Enterprise Avenue, Floor 2",
    city: "London",
    state: "England",
    zip: "E1 6AN",
    country: "United Kingdom",
    taxId: "12-3456789",
  },
  {
    id: "2",
    name: "TechFlow Electronics B.V.",
    email: "contact@techflow.nl",
    address: "Innovation Park 15",
    city: "Amsterdam",
    state: "North Holland",
    zip: "1012 AB",
    country: "Netherlands",
    taxId: "NL123456789B01",
  },
  {
    id: "3",
    name: "Nordic Construction Partners AS",
    email: "info@nordic-construction.no",
    address: "Fjordveien 42",
    city: "Oslo",
    state: "Oslo",
    zip: "0150",
    country: "Norway",
    taxId: "NO987654321",
  },
  {
    id: "4",
    name: "MediCare Pharmaceuticals S.A.",
    email: "billing@medicare-pharma.com",
    address: "Rue de la Santé 25",
    city: "Brussels",
    state: "Brussels",
    zip: "1000",
    country: "Belgium",
    taxId: "BE0123456789",
  },
  {
    id: "5",
    name: "Alpine Gourmet Distributors GmbH",
    email: "orders@alpine-gourmet.de",
    address: "Bergstraße 88",
    city: "Munich",
    state: "Bavaria",
    zip: "80331",
    country: "Germany",
    taxId: "DE987654321",
  },
  {
    id: "6",
    name: "Baltic Food Traders Ltd",
    email: "finance@baltic-food.co.uk",
    address: "Harbour View 12",
    city: "London",
    state: "England",
    zip: "E1 6AN",
    country: "United Kingdom",
    taxId: "GB123456789",
  },
  {
    id: "7",
    name: "AutoParts Distribution SRL",
    email: "invoices@autoparts.ro",
    address: "Strada Industrială 45",
    city: "Bucharest",
    state: "Bucharest",
    zip: "030001",
    country: "Romania",
    taxId: "RO12345678",
  },
  {
    id: "8",
    name: "BuildMate Materials Sp. z o.o.",
    email: "accounting@buildmate.pl",
    address: "ul. Budowlana 67",
    city: "Warsaw",
    state: "Mazovia",
    zip: "00-001",
    country: "Poland",
    taxId: "PL1234567890",
  },
  {
    id: "9",
    name: "Mediterranean Shipping Co.",
    email: "billing@med-shipping.gr",
    address: "Leoforos Poseidonos 15",
    city: "Piraeus",
    state: "Attica",
    zip: "185 31",
    country: "Greece",
    taxId: "GR123456789",
  },
  {
    id: "10",
    name: "Scandinavian Logistics AB",
    email: "finance@scanlog.se",
    address: "Hamngatan 23",
    city: "Stockholm",
    state: "Stockholm",
    zip: "111 47",
    country: "Sweden",
    taxId: "SE123456789012",
  },
  {
    id: "11",
    name: "Iberian Textiles S.L.",
    email: "contabilidad@iberian-textiles.es",
    address: "Calle de la Industria 78",
    city: "Barcelona",
    state: "Catalonia",
    zip: "08001",
    country: "Spain",
    taxId: "ES12345678Z",
  },
  {
    id: "12",
    name: "French Wine Exporters SARL",
    email: "billing@french-wine.fr",
    address: "Rue du Vin 156",
    city: "Bordeaux",
    state: "Nouvelle-Aquitaine",
    zip: "33000",
    country: "France",
    taxId: "FR12345678901",
  },
];

export default function FinanceInvoicesPage() {
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const invoicePreviewRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    taxId: "",
  });
  const [invoiceNumber, setInvoiceNumber] = useState("INV-129482-000");
  const [issueDate, setIssueDate] = useState("2025-01-17");
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const [ibanType, setIbanType] = useState<"domestic" | "international">(
    "domestic"
  );
  const [selectedIban, setSelectedIban] = useState<string>(
    "CH93 0076 2011 6238 5295 7"
  );
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const IBAN_OPTIONS: {
    type: "domestic" | "international";
    label: string;
    country: string;
    value: string;
  }[] = [
      {
        type: "international",
        label: "Switzerland (CH)",
        country: "Switzerland",
        value: "CH93 0076 2011 6238 5295 7",
      },
      {
        type: "domestic",
        label: "Greece (GR)",
        country: "Greece",
        value: "GR16 0110 1250 0000 0001 2300 695",
      },
    ];

  // Calculate due date based on payment terms
  const calculateDueDate = () => {
    const issueDateObj = new Date(issueDate);
    const dueDateObj = new Date(issueDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + paymentTerms);
    return dueDateObj.toISOString().split("T")[0];
  };

  const dueDate = calculateDueDate();

  // Filter clients based on search
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.city.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.country.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalVat = items.reduce(
    (sum, item) => sum + (item.price * item.quantity * item.vat) / 100,
    0
  );
  const total = subtotal + totalVat;

  useEffect(() => {
    animateOnMount(".invoice-header", { delay: 0.05 });
    animateOnMount(".invoice-form", { delay: 0.1 });
    animateOnMount(".invoice-preview", { delay: 0.15 });
    animateOnMount(".invoice-item", { delay: 0.2, stagger: 0.05 });
    addHoverEffects(".invoice-button", 1.05);
  }, [animateOnMount, addHoverEffects]);

  // Hydrate selected client from Risk Engine stored selection
  useEffect(() => {
    try {
      // If coming from "Edit draft", hydrate all draft fields first
      const editingId = sessionStorage.getItem("factora:editingDraftId");
      if (editingId) {
        const draftsRaw = sessionStorage.getItem("factora:draftInvoices");
        if (draftsRaw) {
          const drafts = JSON.parse(draftsRaw) as any[];
          const draft = drafts.find((d) => d && d.id === editingId);
          if (draft) {
            // Hydrate core invoice fields
            if (draft.id) setInvoiceNumber(String(draft.id));
            if (draft.issueDateISO) setIssueDate(String(draft.issueDateISO));
            if (draft.paymentTerms != null)
              setPaymentTerms(Number(draft.paymentTerms));
            if (draft.currency) setCurrency(String(draft.currency));
            if (Array.isArray(draft.items)) setItems(draft.items as any);
            if (draft.ibanType) setIbanType(draft.ibanType);
            if (draft.selectedIban) setSelectedIban(String(draft.selectedIban));
            if (draft.shippingAddressRaw)
              setShippingAddress(draft.shippingAddressRaw);

            // Hydrate client selection if present
            if (draft.clientRaw) {
              setSelectedClient(draft.clientRaw as Client);
            } else if (draft.businessName || draft.vat) {
              const hydrated: Client = {
                id: "draft-client",
                name: draft.businessName || "",
                email: draft.businessEmail || "",
                address: Array.isArray(draft.businessAddressLines)
                  ? draft.businessAddressLines[0] || ""
                  : "",
                city: "",
                state: "",
                zip: "",
                country: "",
                taxId: draft.vat || "",
              };
              setSelectedClient(hydrated);
            }
          }
        }
        // One-time use
        sessionStorage.removeItem("factora:editingDraftId");
      }

      const raw = sessionStorage.getItem("factora:selectedInvoiceClient");
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; taxId?: string };
        if (parsed?.name) {
          const hydrated: Client = {
            id: "risk-selected",
            name: parsed.name,
            email: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            country: "",
            taxId: parsed.taxId || "",
          };
          setSelectedClient(hydrated);
        }
      }
    } catch (_) { }
  }, []);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unit: "item",
      price: 0,
      vat: 10, // Default VAT rate
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Always calculate total as quantity * price
          updated.total = updated.quantity * updated.price;
          return updated;
        }
        return item;
      })
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const handleSendInvoiceConfirm = () => {
    const shippingProvided = Boolean(
      shippingAddress.address ||
      shippingAddress.city ||
      shippingAddress.state ||
      shippingAddress.zip ||
      shippingAddress.country
    );

    const shippingLines = [
      shippingAddress.address,
      [shippingAddress.city, shippingAddress.state, shippingAddress.zip]
        .filter(Boolean)
        .join(", "),
      shippingAddress.country,
    ].filter(Boolean) as string[];

    const clientLines = [
      selectedClient?.address,
      [selectedClient?.city, selectedClient?.state, selectedClient?.zip]
        .filter(Boolean)
        .join(", "),
      selectedClient?.country,
    ].filter(Boolean) as string[];

    const bizLines = shippingProvided ? shippingLines : clientLines;

    const pending = {
      id: invoiceNumber || `INV-${Date.now()}`,
      created: new Date(issueDate || Date.now()).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      issueDateISO: issueDate,
      amount: new Intl.NumberFormat("en-US", { style: "currency", currency })
        .format(total)
        .replace("$", "€"),
      status: "Pending" as const,
      vat: selectedClient?.taxId || "",
      businessName: selectedClient?.name || "",
      businessAddressLines: bizLines,
      businessEmail: selectedClient?.email || "",
      businessPhone: "",
      currency,
      paymentTerms,
      items,
      ibanType,
      selectedIban,
      shippingAddressRaw: shippingAddress,
      clientRaw: selectedClient,
    };

    try {
      const key = "factora:pendingInvoices";
      const raw = sessionStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      const withoutDup = arr.filter((x) => x && x.id !== pending.id);
      const next = [...withoutDup, pending];
      sessionStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("pendingInvoicesUpdated"));
      sessionStorage.removeItem("factora:selectedInvoiceClient");
    } catch (_) { }

    setSendDialogOpen(false);
    router.push("/financing");
  };

  const saveDraft = () => {
    const shippingProvided = Boolean(
      shippingAddress.address ||
      shippingAddress.city ||
      shippingAddress.state ||
      shippingAddress.zip ||
      shippingAddress.country
    );

    const shippingLines = [
      shippingAddress.address,
      [shippingAddress.city, shippingAddress.state, shippingAddress.zip]
        .filter(Boolean)
        .join(", "),
      shippingAddress.country,
    ].filter(Boolean) as string[];

    const clientLines = [
      selectedClient?.address,
      [selectedClient?.city, selectedClient?.state, selectedClient?.zip]
        .filter(Boolean)
        .join(", "),
      selectedClient?.country,
    ].filter(Boolean) as string[];

    const bizLines = shippingProvided ? shippingLines : clientLines;

    const draft = {
      id: invoiceNumber || `INV-${Date.now()}`,
      created: new Date(issueDate || Date.now()).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      issueDateISO: issueDate,
      amount: new Intl.NumberFormat("en-US", { style: "currency", currency })
        .format(total)
        .replace("$", "€"),
      status: "Draft" as const,
      vat: selectedClient?.taxId || "",
      businessName: selectedClient?.name || "",
      businessAddressLines: bizLines,
      businessEmail: selectedClient?.email || "",
      businessPhone: "",
      currency,
      paymentTerms,
      items,
      ibanType,
      selectedIban,
      shippingAddressRaw: shippingAddress,
      clientRaw: selectedClient,
    };

    try {
      const key = "factora:draftInvoices";
      const raw = sessionStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      const withoutDup = arr.filter((x) => x && x.id !== draft.id);
      const next = [...withoutDup, draft];
      sessionStorage.setItem(key, JSON.stringify(next));
      // Notify other tabs/pages
      window.dispatchEvent(new Event("draftInvoicesUpdated"));
      // Mark which draft to load on the editor
      sessionStorage.setItem("factora:editingDraftId", draft.id);
      // Redirect to invoice management
      router.push("/financing");
    } catch (_) { }
  };

  const handleDownloadPdf = async () => {
    if (!invoicePreviewRef.current) return;

    // Dynamically import libraries only when needed
    const html2canvas = (await import("html2canvas-pro")).default;
    const { default: jsPDF } = await import("jspdf");

    const element = invoicePreviewRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: -window.scrollY,
    });

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const marginMm = 10;
    const availWidthMm = pageWidthMm - marginMm * 2;
    const availHeightMm = pageHeightMm - marginMm * 2;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Scale to fit available width; compute pixels-per-page height
    const scaleToWidth = availWidthMm / imgWidthPx; // mm per px
    const pageHeightPx = availHeightMm / scaleToWidth; // px worth of height per page

    // Create a temporary canvas to slice the original into page-sized chunks
    const pageCanvas = document.createElement("canvas");
    const pageCtx = pageCanvas.getContext("2d");

    let renderedHeightPx = 0;
    let firstPage = true;
    while (renderedHeightPx < imgHeightPx) {
      const sliceHeightPx = Math.min(
        pageHeightPx,
        imgHeightPx - renderedHeightPx
      );
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = Math.max(1, Math.floor(sliceHeightPx));

      if (pageCtx) {
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        // Draw the portion of the original canvas for this page
        pageCtx.drawImage(
          canvas,
          0,
          renderedHeightPx,
          imgWidthPx,
          sliceHeightPx,
          0,
          0,
          imgWidthPx,
          sliceHeightPx
        );
      }

      const imgData = pageCanvas.toDataURL("image/png");
      const renderWidthMm = availWidthMm;
      const renderHeightMm = sliceHeightPx * scaleToWidth;

      if (!firstPage) {
        pdf.addPage();
      }
      firstPage = false;
      pdf.addImage(
        imgData,
        "PNG",
        marginMm,
        marginMm,
        renderWidthMm,
        renderHeightMm
      );

      renderedHeightPx += sliceHeightPx;
    }

    pdf.save("invoice.pdf");
  };

  const handleAddClient = () => {
    if (!newClient.name || !newClient.email) return;

    const client: Client = {
      id: Date.now().toString(),
      ...newClient,
    };

    setClients([...clients, client]);
    setSelectedClient(client);
    setShowAddClientDialog(false);
    setNewClient({
      name: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      taxId: "",
    });
  };

  const handleCancelAddClient = () => {
    setShowAddClientDialog(false);
    setNewClient({
      name: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      taxId: "",
    });
  };

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddClientDialog) {
        handleCancelAddClient();
      }
    };

    if (showAddClientDialog) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showAddClientDialog]);

  return (
    <main ref={containerRef} className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="invoice-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Finance Invoices
              </h1>
              <p className="text-slate-600 mt-1">
                Create and manage your business invoices
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="invoice-button flex items-center gap-2"
                onClick={saveDraft}
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </Button>
              <Button
                onClick={() => setSendDialogOpen(true)}
                className="invoice-button bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invoice
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Form */}
          <motion.div
            className="invoice-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Invoice Number
                      </label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary appearance-none bg-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="CHF">CHF (CHF)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CNY">CNY (¥)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="BRL">BRL (R$)</option>
                        <option value="MXN">MXN ($)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="HKD">HKD (HK$)</option>
                        <option value="NZD">NZD (NZ$)</option>
                        <option value="SEK">SEK (kr)</option>
                        <option value="NOK">NOK (kr)</option>
                        <option value="DKK">DKK (kr)</option>
                        <option value="PLN">PLN (zł)</option>
                        <option value="CZK">CZK (Kč)</option>
                        <option value="HUF">HUF (Ft)</option>
                        <option value="RUB">RUB (₽)</option>
                        <option value="TRY">TRY (₺)</option>
                        <option value="ZAR">ZAR (R)</option>
                        <option value="KRW">KRW (₩)</option>
                        <option value="THB">THB (฿)</option>
                        <option value="IDR">IDR (Rp)</option>
                        <option value="MYR">MYR (RM)</option>
                        <option value="PHP">PHP (₱)</option>
                        <option value="VND">VND (₫)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Issue Date
                      </label>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Payment Terms
                      </label>
                      <select
                        value={paymentTerms}
                        onChange={(e) =>
                          setPaymentTerms(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary appearance-none bg-white"
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Shipping Address
                    </label>
                    <Input
                      value={shippingAddress.address}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          address: e.target.value,
                        })
                      }
                      placeholder="Enter street address"
                      className="focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        City
                      </label>
                      <Input
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            city: e.target.value,
                          })
                        }
                        placeholder="Enter city"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        State/Province
                      </label>
                      <Input
                        value={shippingAddress.state}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            state: e.target.value,
                          })
                        }
                        placeholder="Enter state/province"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        ZIP/Postal Code
                      </label>
                      <Input
                        value={shippingAddress.zip}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            zip: e.target.value,
                          })
                        }
                        placeholder="Enter ZIP/postal code"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Country
                      </label>
                      <Input
                        value={shippingAddress.country}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            country: e.target.value,
                          })
                        }
                        placeholder="Enter country"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Client Selection - commented out */}
                {/**
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-700">
                    Billed To
                  </label>
                  {selectedClient ? (
                    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-primary to-brand-grad-start flex items-center justify-center text-white font-semibold">
                            {selectedClient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {selectedClient.name}
                            </div>
                            <div className="text-sm text-slate-600">
                              {selectedClient.email}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(null)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAddClientDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Client
                      </Button>
                    </div>
                  )}
                </div>
                */}

                {/* Invoice Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Invoice Items
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                      className="invoice-button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        className="invoice-item p-4 border border-slate-200 rounded-lg bg-white"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="space-y-4">
                          {/* Item Name */}
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                              Item Name
                            </label>
                            <Input
                              placeholder="Enter item name or description"
                              value={item.description}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="focus:ring-brand-primary focus:border-brand-primary"
                            />
                          </div>

                          {/* Price, Quantity, VAT */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Price
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.price === 0 ? "" : item.price}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "price",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="focus:ring-brand-primary focus:border-brand-primary"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Quantity
                              </label>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="1"
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  if (value >= 0) {
                                    updateItem(item.id, "quantity", value);
                                  }
                                }}
                                className="focus:ring-brand-primary focus:border-brand-primary"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                VAT (%)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={item.vat === 0 ? "" : item.vat}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "vat",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="focus:ring-brand-primary focus:border-brand-primary"
                              />
                            </div>
                          </div>

                          {/* Calculated Total Display */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-700">
                              Item Total:
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-slate-900">
                                {formatCurrency(item.total)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* IBAN Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Bank Account (IBAN)
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {IBAN_OPTIONS.map((opt) => (
                      <div
                        key={opt.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedIban === opt.value
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-slate-200 hover:bg-slate-50"
                          }`}
                        onClick={() => {
                          setSelectedIban(opt.value);
                          setIbanType(opt.type);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-primary to-brand-grad-start flex items-center justify-center text-white font-semibold">
                              {opt.label.split(" ")[0].charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {opt.label}
                              </div>
                              <div className="text-sm text-slate-600">
                                {opt.value}
                              </div>
                            </div>
                          </div>
                          {selectedIban === opt.value ? (
                            <Badge className="bg-brand-primary text-white">
                              Selected
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Invoice Preview */}
          <motion.div
            className="invoice-preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          >
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoice Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="invoice-button"
                      onClick={handleDownloadPdf}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={invoicePreviewRef}>
                  {/* Invoice Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      INVOICE
                    </h2>
                    <div className="text-sm text-slate-600">
                      Invoice #{invoiceNumber}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">
                        From:
                      </h3>
                      <div className="text-sm text-slate-700">
                        <div className="font-semibold">
                          Euromed Supplies GmbH
                        </div>
                        <div>789 Enterprise Avenue, Floor 2</div>
                        <div>Metropolis, Country</div>
                        <div>Germany</div>
                        <div>Tax ID: DE123456789</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">To:</h3>
                      {selectedClient ? (
                        <div className="text-sm text-slate-700">
                          <div className="font-semibold">
                            {selectedClient.name}
                          </div>
                          {selectedClient.address && (
                            <div>{selectedClient.address}</div>
                          )}
                          {(() => {
                            const line = [
                              selectedClient.city,
                              selectedClient.state,
                              selectedClient.zip,
                            ]
                              .filter(Boolean)
                              .join(", ");
                            return line ? <div>{line}</div> : null;
                          })()}
                          {selectedClient.country && (
                            <div>{selectedClient.country}</div>
                          )}
                          <div>Tax ID: {selectedClient.taxId}</div>
                          {(shippingAddress.address ||
                            shippingAddress.city ||
                            shippingAddress.state ||
                            shippingAddress.zip ||
                            shippingAddress.country) && (
                              <div className="mt-2">
                                <div className="text-slate-500">Shipping:</div>
                                <div>{shippingAddress.address}</div>
                                <div>
                                  {shippingAddress.city}
                                  {shippingAddress.city && shippingAddress.state
                                    ? ", "
                                    : ""}
                                  {shippingAddress.state} {shippingAddress.zip}
                                </div>
                                <div>{shippingAddress.country}</div>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic">
                          Select a client
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                    <div>
                      <div className="text-slate-500">Issue Date:</div>
                      <div className="font-medium">
                        {new Date(issueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Due Date:</div>
                      <div className="font-medium">
                        {new Date(dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Currency:</div>
                      <div className="font-medium">{currency}</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-8">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 font-medium text-slate-700">
                              Description
                            </th>
                            <th className="text-right py-3 font-medium text-slate-700">
                              Qty
                            </th>
                            <th className="text-right py-3 font-medium text-slate-700">
                              Price
                            </th>
                            <th className="text-right py-3 font-medium text-slate-700">
                              VAT %
                            </th>
                            <th className="text-right py-3 font-medium text-slate-700">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100"
                            >
                              <td className="py-3 text-slate-700">
                                {item.description || "Item description"}
                              </td>
                              <td className="py-3 text-right text-slate-700">
                                {item.quantity}
                              </td>
                              <td className="py-3 text-right text-slate-700">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="py-3 text-right text-slate-700">
                                {item.vat}%
                              </td>
                              <td className="py-3 text-right font-medium text-slate-900">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">VAT:</span>
                      <span className="font-medium">
                        {formatCurrency(totalVat)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Payment Information
                    </h3>
                    <div className="text-sm text-slate-700 space-y-1">
                      <div>
                        Payment is due by{" "}
                        {new Date(dueDate).toLocaleDateString()}
                      </div>
                      <div>
                        Include the invoice number in the payment reference
                      </div>
                      <div className="pt-2">
                        <div className="text-slate-500">
                          IBAN (
                          {ibanType === "domestic"
                            ? "Domestic"
                            : "International"}
                          ):
                        </div>
                        <div className="font-medium break-words">
                          {selectedIban}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Add Client Dialog */}
        {showAddClientDialog && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancelAddClient}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Add New Client
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAddClient}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Company Name *
                      </label>
                      <Input
                        value={newClient.name}
                        onChange={(e) =>
                          setNewClient({ ...newClient, name: e.target.value })
                        }
                        placeholder="Enter company name"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={newClient.email}
                        onChange={(e) =>
                          setNewClient({ ...newClient, email: e.target.value })
                        }
                        placeholder="Enter email address"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Address
                    </label>
                    <Input
                      value={newClient.address}
                      onChange={(e) =>
                        setNewClient({ ...newClient, address: e.target.value })
                      }
                      placeholder="Enter street address"
                      className="focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        City
                      </label>
                      <Input
                        value={newClient.city}
                        onChange={(e) =>
                          setNewClient({ ...newClient, city: e.target.value })
                        }
                        placeholder="Enter city"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        State/Province
                      </label>
                      <Input
                        value={newClient.state}
                        onChange={(e) =>
                          setNewClient({ ...newClient, state: e.target.value })
                        }
                        placeholder="Enter state/province"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        ZIP/Postal Code
                      </label>
                      <Input
                        value={newClient.zip}
                        onChange={(e) =>
                          setNewClient({ ...newClient, zip: e.target.value })
                        }
                        placeholder="Enter ZIP/postal code"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Country
                      </label>
                      <Input
                        value={newClient.country}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            country: e.target.value,
                          })
                        }
                        placeholder="Enter country"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Tax ID
                      </label>
                      <Input
                        value={newClient.taxId}
                        onChange={(e) =>
                          setNewClient({ ...newClient, taxId: e.target.value })
                        }
                        placeholder="Enter tax ID"
                        className="focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={handleCancelAddClient}
                    className="invoice-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddClient}
                    disabled={!newClient.name || !newClient.email}
                    className="invoice-button bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      {/* Send Invoice Confirmation */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>Publish invoice to your customer?</DialogTitle>
            <DialogDescription>
              The buyer is approved for credit on this invoice. The terms
              requested fall within their current eligibility and can be
              supported. Would you like to continue with publishing? We’ll
              notify your customer and mark this invoice as Pending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvoiceConfirm}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
            >
              Publish invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
