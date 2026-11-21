/** Read an API failure without trusting its runtime shape. */
export function getApiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const data = error.data;
  if (!data || typeof data !== "object" || !("error" in data)) return undefined;
  const detail = data.error;
  if (!detail || typeof detail !== "object" || !("message" in detail)) return undefined;
  return typeof detail.message === "string" && detail.message.trim() ? detail.message : undefined;
}
