import { apiFetchBlob } from "@/lib/api/client";

/** Download a file stored on the backend (e.g. GEMI PDF). Requires auth + org context. */
export function downloadStoredFile(filename: string): Promise<Blob> {
  const path = `/v1/files/${encodeURIComponent(filename)}`;
  return apiFetchBlob(path);
}
