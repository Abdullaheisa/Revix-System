/** Read an API failure without trusting its runtime shape. */
export function getApiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const errObj = error as { status?: unknown; error?: unknown; data?: unknown };
  if (errObj.status === "FETCH_ERROR") {
    return "Cannot reach the backend server. Please make sure the API server is running.";
  }
  if (!("data" in errObj) || !errObj.data || typeof errObj.data !== "object") return undefined;
  const data = errObj.data as { error?: unknown; message?: unknown };
  if ("error" in data && data.error && typeof data.error === "object") {
    const detail = data.error as { message?: unknown };
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message;
    }
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  return undefined;
}
