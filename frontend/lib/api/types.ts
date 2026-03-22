export type AppErrorBody = {
  detail: string;
  code: string;
  fields?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let detail = res.statusText || "Request failed";
  let code = "http.error";
  let fields: Record<string, string> | undefined;

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body.detail === "string") detail = body.detail;
      if (typeof body.code === "string") code = body.code;
      if (body.fields && typeof body.fields === "object" && body.fields !== null) {
        const f = body.fields as Record<string, unknown>;
        fields = {};
        for (const [k, v] of Object.entries(f)) {
          if (typeof v === "string") fields[k] = v;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return new ApiError(detail, res.status, code, fields);
}
