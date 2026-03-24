import { apiFetchJson } from "@/lib/api/client";
import {
  businessResponseSchema,
  organizationSetupRequestSchema,
  type BusinessResponse,
  type OrganizationSetupRequest,
} from "@/lib/schemas/organization";

export async function createOrganization(
  body: OrganizationSetupRequest
): Promise<BusinessResponse> {
  const parsed = organizationSetupRequestSchema.parse(body);
  const raw: unknown = await apiFetchJson<unknown>("/v1/organizations/", {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  return businessResponseSchema.parse(raw);
}
