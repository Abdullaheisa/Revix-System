/** Normalize untrusted query values and numeric pagination input. */
export function normalizePage(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1;
  if (typeof value === "string" && !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}
