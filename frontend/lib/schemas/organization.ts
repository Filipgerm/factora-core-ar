import { z } from "zod";

const uuidLike = z.string().uuid();

export const organizationSetupRequestSchema = z.object({
  name: z.string().min(1).max(255),
  vat_number: z.string().min(5).max(30),
  country: z.string().min(2).max(2),
});

export const businessResponseSchema = z.object({
  organization_id: uuidLike,
  name: z.string(),
  vat_number: z.string(),
  country: z.string(),
  registry_data: z
    .union([z.record(z.unknown()), z.null()])
    .optional(),
  saltedge_customer_id: z.string().nullable().optional(),
});

export const userOrganizationMembershipItemSchema = z.object({
  organization_id: uuidLike,
  name: z.string(),
  vat_number: z.string(),
  country: z.string(),
  role: z.string(),
  is_current: z.boolean(),
});

export const switchOrganizationRequestSchema = z.object({
  organization_id: uuidLike,
});

export const switchOrganizationResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default("bearer"),
  expires_at: z.coerce.date(),
  user_id: uuidLike,
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  organization_id: uuidLike.nullish(),
  email_verified: z.boolean().optional().default(false),
  phone_verified: z.boolean().optional().default(false),
});

export const counterpartyCreateSchema = z.object({
  name: z.string().min(1).max(255),
  vat_number: z.string().nullable().optional(),
  country: z.string().min(2).max(2).nullable().optional(),
  address_street: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_postal_code: z.string().nullable().optional(),
  address_region: z.string().nullable().optional(),
  type: z.string(),
  contact_info: z
    .union([z.record(z.unknown()), z.null()])
    .optional(),
  default_category_id: uuidLike.nullable().optional(),
});

export const counterpartyUpdateSchema = counterpartyCreateSchema.partial();

export const counterpartyResponseSchema = z.object({
  id: uuidLike,
  organization_id: uuidLike,
  name: z.string(),
  vat_number: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address_street: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_postal_code: z.string().nullable().optional(),
  address_region: z.string().nullable().optional(),
  type: z.string(),
  contact_info: z
    .union([z.record(z.unknown()), z.null()])
    .optional(),
  default_category_id: uuidLike.nullable().optional(),
  registry_data: z
    .union([z.record(z.unknown()), z.null()])
    .optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type OrganizationSetupRequest = z.infer<
  typeof organizationSetupRequestSchema
>;
export type BusinessResponse = z.infer<typeof businessResponseSchema>;
export type CounterpartyCreate = z.infer<typeof counterpartyCreateSchema>;
export type CounterpartyUpdate = z.infer<typeof counterpartyUpdateSchema>;
export type CounterpartyResponse = z.infer<typeof counterpartyResponseSchema>;
export type UserOrganizationMembershipItem = z.infer<
  typeof userOrganizationMembershipItemSchema
>;
export type SwitchOrganizationRequest = z.infer<
  typeof switchOrganizationRequestSchema
>;
export type SwitchOrganizationResponse = z.infer<
  typeof switchOrganizationResponseSchema
>;
