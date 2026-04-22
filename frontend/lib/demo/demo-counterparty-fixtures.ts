/**
 * Mirrors `backend/app/core/demo_fixtures/organization_counterparties.json` for the
 * seeded demo org so the frontend can merge missing rows when the DB was not re-seeded.
 */

import type { CounterpartyResponse } from "@/lib/schemas/organization";

/** Same id as `DEMO_ORG_ID` in `backend/scripts/seed_demo_db.py`. */
export const FACTORA_SEED_ORGANIZATION_ID =
  "00000000-0000-0000-0000-000000000001";

/** Full fixture set for merge / breadcrumb fallbacks (matches seed JSON). */
export const DEMO_COUNTERPARTY_FIXTURES: CounterpartyResponse[] = [
  {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c01",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Atlas Cloud Services IKE",
    vat_number: "801234567",
    country: "GR",
    address_street: "Leof. Kifisias 120",
    address_city: "Marousi",
    address_postal_code: "151 25",
    address_region: "Attica",
    type: "customer",
    contact_info: {
      email: "ar@atlascloud.example",
      phone: "+30 210 5550100",
    },
    default_category_id: null,
    registry_data: { source: "demo", gemi_hint: "demo-registry" },
    created_at: new Date("2024-06-01T08:00:00+00:00"),
    updated_at: new Date("2025-02-01T10:00:00+00:00"),
  },
  {
    id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d02",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Nordic Parts AB",
    vat_number: "SE5566778899",
    country: "SE",
    address_street: "Sveavägen 44",
    address_city: "Stockholm",
    address_postal_code: "111 34",
    address_region: null,
    type: "vendor",
    contact_info: { email: "orders@nordicparts.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-07-12T12:30:00+00:00"),
    updated_at: new Date("2025-01-20T09:15:00+00:00"),
  },
  {
    id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e03",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Piraeus Logistics S.A.",
    vat_number: "094012345",
    country: "GR",
    address_street: "Akti Miaouli 85",
    address_city: "Piraeus",
    address_postal_code: "185 38",
    address_region: "Attica",
    type: "both",
    contact_info: { email: "billing@pirlog.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-08-03T07:45:00+00:00"),
    updated_at: new Date("2025-02-10T16:20:00+00:00"),
  },
  {
    id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f04",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Hetzner Online GmbH",
    vat_number: "DE812871812",
    country: "DE",
    address_street: "Industriestr. 25",
    address_city: "Gunzenhausen",
    address_postal_code: "91710",
    address_region: "Bavaria",
    type: "vendor",
    contact_info: { email: "accounting@hetzner.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-09-18T00:00:00+00:00"),
    updated_at: new Date("2025-02-12T08:00:00+00:00"),
  },
  {
    id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a05",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Meridian Design Studio E.E.",
    vat_number: "EL998877665",
    country: "GR",
    address_street: "Ermou 12",
    address_city: "Thessaloniki",
    address_postal_code: "546 25",
    address_region: "Central Macedonia",
    type: "customer",
    contact_info: { email: "hello@meridian-design.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-11-05T14:00:00+00:00"),
    updated_at: new Date("2025-02-14T11:30:00+00:00"),
  },
  {
    id: "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90101",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Digital Consulting AB",
    vat_number: "SE5566123456",
    country: "SE",
    address_street: "Skeppsbron 26",
    address_city: "Stockholm",
    address_postal_code: "111 30",
    address_region: null,
    type: "customer",
    contact_info: { email: "finance@digitalconsulting.example" },
    default_category_id: null,
    registry_data: { source: "demo", integrations: ["QBO", "Salesforce"] },
    created_at: new Date("2025-04-17T09:00:00+00:00"),
    updated_at: new Date("2025-04-17T09:00:00+00:00"),
  },
  {
    id: "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90102",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "ACME Corporation",
    vat_number: "DE301234567",
    country: "DE",
    address_street: "Potsdamer Platz 8",
    address_city: "Berlin",
    address_postal_code: "10785",
    address_region: "Berlin",
    type: "customer",
    contact_info: { email: "ap@acme.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-09-01T08:00:00+00:00"),
    updated_at: new Date("2025-03-01T10:00:00+00:00"),
  },
  {
    id: "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90103",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Digital Services Ltd",
    vat_number: "IE9876543X",
    country: "IE",
    address_street: "Grand Canal Dock",
    address_city: "Dublin",
    address_postal_code: "D02 X285",
    address_region: "Leinster",
    type: "customer",
    contact_info: { email: "billing@digitalservices.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-10-15T11:20:00+00:00"),
    updated_at: new Date("2025-02-20T14:00:00+00:00"),
  },
  {
    id: "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90104",
    organization_id: FACTORA_SEED_ORGANIZATION_ID,
    name: "Coastal Technologies OÜ",
    vat_number: "EE102030405",
    country: "EE",
    address_street: "Narva mnt 7",
    address_city: "Tallinn",
    address_postal_code: "10117",
    address_region: "Harju",
    type: "customer",
    contact_info: { email: "ar@coastaltech.example" },
    default_category_id: null,
    registry_data: null,
    created_at: new Date("2024-05-10T07:30:00+00:00"),
    updated_at: new Date("2025-01-28T16:45:00+00:00"),
  },
];

export const DEMO_COUNTERPARTY_NAME_BY_ID: Record<string, string> =
  Object.fromEntries(DEMO_COUNTERPARTY_FIXTURES.map((c) => [c.id, c.name]));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelyUuid(segment: string): boolean {
  return UUID_RE.test(segment);
}

export function mergeSeedOrgCounterparties(
  apiRows: CounterpartyResponse[],
  organizationId: string | null | undefined
): CounterpartyResponse[] {
  if (organizationId !== FACTORA_SEED_ORGANIZATION_ID) {
    return apiRows;
  }
  const byId = new Map(apiRows.map((r) => [r.id, r]));
  for (const fixture of DEMO_COUNTERPARTY_FIXTURES) {
    if (!byId.has(fixture.id)) {
      byId.set(fixture.id, fixture);
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
}
