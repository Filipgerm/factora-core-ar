import { ApiError } from "@/lib/api/types";
import { appErrorBodySchema } from "@/lib/schemas/api-error";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const raw: unknown = await res.json();
      const parsed = appErrorBodySchema.safeParse(raw);
      if (parsed.success) {
        const { detail, code, fields } = parsed.data;
        return new ApiError(detail, res.status, code, fields);
      }
      if (isRecord(raw) && typeof raw.detail === "string") {
        return new ApiError(raw.detail, res.status, "http.error", {});
      }
    } catch {
      /* fall through */
    }
  }

  return new ApiError(
    res.statusText || "Request failed",
    res.status,
    "http.error",
    {}
  );
}
