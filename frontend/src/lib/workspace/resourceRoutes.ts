export const VEHICLE_PROFILE_TABS = [
  "overview",
  "insurance",
  "contracts",
  "history",
  "movement",
  "pricing",
  "maintenance",
  "inspections",
  "timeline",
] as const;
export type VehicleProfileTab = (typeof VEHICLE_PROFILE_TABS)[number];

export interface FleetResourceRoute {
  resource:
    | "vehicles"
    | "purchase-orders"
    | "vendors"
    | "insurance-companies"
    | "price-list"
    | "customers"
    | "rental-contracts";
  id: string | null;
  action: "list" | "detail" | "create" | "receive";
  tab: VehicleProfileTab;
}

export function parseFleetResourceRoute(pathname: string): FleetResourceRoute | null {
  const clean = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const parts = clean.split("/").filter(Boolean);
  const resource = parts[2];
  if (
    parts[0] !== "workspace" ||
    parts[1] !== "fleet" ||
    (resource !== "vehicles" &&
      resource !== "purchase-orders" &&
      resource !== "vendors" &&
      resource !== "insurance-companies" &&
      resource !== "price-list" &&
      resource !== "customers" &&
      resource !== "rental-contracts")
  ) {
    return null;
  }
  const id = parts[3] ? decodeURIComponent(parts[3]) : null;
  if (!id) return { resource, id: null, action: "list", tab: "overview" };
  if (id === "new") return { resource, id: null, action: "create", tab: "overview" };
  const tab = VEHICLE_PROFILE_TABS.find((value) => value === parts[4]) ?? "overview";
  return { resource, id, action: resource === "purchase-orders" && parts[4] === "receive" ? "receive" : "detail", tab };
}

export function vehicleHref(id: string, tab: VehicleProfileTab = "overview"): string {
  return `/workspace/fleet/vehicles/${encodeURIComponent(id)}${tab === "overview" ? "" : `/${tab}`}`;
}

export function purchaseOrderHref(id?: string | null, action?: "create" | "receive"): string {
  if (action === "create") return "/workspace/fleet/purchase-orders/new";
  if (!id) return "/workspace/fleet/purchase-orders";
  return `/workspace/fleet/purchase-orders/${encodeURIComponent(id)}${action === "receive" ? "/receive" : ""}`;
}

export function vendorHref(id?: string | null): string {
  if (!id) return "/workspace/fleet/vendors";
  return `/workspace/fleet/vendors/${encodeURIComponent(id)}`;
}

export function insuranceCompanyHref(id?: string | null): string {
  if (!id) return "/workspace/fleet/insurance-companies";
  return `/workspace/fleet/insurance-companies/${encodeURIComponent(id)}`;
}

export function priceListVariantHref(variantId?: string | null): string {
  if (!variantId) return "/workspace/fleet/price-list";
  return `/workspace/fleet/price-list/${encodeURIComponent(variantId)}`;
}

export function customerHref(id?: string | null): string {
  if (!id) return "/workspace/fleet/customers";
  return `/workspace/fleet/customers/${encodeURIComponent(id)}`;
}

export function rentalContractHref(id?: string | null): string {
  if (!id) return "/workspace/fleet/rental-contracts";
  return `/workspace/fleet/rental-contracts/${encodeURIComponent(id)}`;
}

export function rentalContractNewHref(params?: {
  vehicleId?: string | null;
  customerId?: string | null;
  startDate?: string | null;
}): string {
  const qs = new URLSearchParams();
  if (params?.vehicleId) qs.set("vehicleId", params.vehicleId);
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.startDate) qs.set("startDate", params.startDate);
  const query = qs.toString();
  return `/workspace/fleet/rental-contracts/new${query ? `?${query}` : ""}`;
}
