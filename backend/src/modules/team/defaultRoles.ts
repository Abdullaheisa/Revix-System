import type {
  PermissionMatrix,
  PermissionResource,
  RoleScopeType,
} from "../../db/store.ts";

export interface PermissionCatalogItem {
  resource: PermissionResource;
  actions: readonly string[];
}

export const PERMISSION_CATALOG: readonly PermissionCatalogItem[] = [
  { resource: "company", actions: ["read", "update"] },
  { resource: "branches", actions: ["read", "create", "update"] },
  {
    resource: "team",
    actions: ["read", "invite", "manage_members", "manage_roles"],
  },
  { resource: "fleet", actions: ["read", "create", "update"] },
  { resource: "purchase_orders", actions: ["read", "create", "update", "approve"] },
  { resource: "vendors", actions: ["read", "create", "update"] },
  { resource: "variants", actions: ["read", "create", "update"] },
  { resource: "vehicle_photos", actions: ["read", "create", "update"] },
  { resource: "rental_inclusions", actions: ["read", "create", "update"] },
  { resource: "sales", actions: ["read", "create", "update"] },
  { resource: "operations", actions: ["read", "create", "update"] },
  { resource: "finance", actions: ["read", "create", "approve"] },
  { resource: "network", actions: ["read", "manage"] },
] as const;

export interface DefaultRoleDefinition {
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
}

export const DEFAULT_COMPANY_ROLES: readonly DefaultRoleDefinition[] = [
  {
    code: "owner",
    nameEn: "Owner",
    nameAr: "المالك",
    descriptionEn:
      "Full unrestricted access across company settings, branches, team, fleet, sales, and finance.",
    descriptionAr:
      "صلاحية كاملة غير مقيدة على إعدادات الشركة، الفروع، الفريق، الأسطول، المبيعات، والمالية.",
    scopeType: "company_wide",
    permissions: {
      company: ["read", "update"],
      branches: ["read", "create", "update"],
      team: ["read", "invite", "manage_members", "manage_roles"],
      fleet: ["read", "create", "update"],
      purchase_orders: ["read", "create", "update", "approve"],
      vendors: ["read", "create", "update"],
      variants: ["read", "create", "update"],
      vehicle_photos: ["read", "create", "update"],
      rental_inclusions: ["read", "create", "update"],
      sales: ["read", "create", "update"],
      operations: ["read", "create", "update"],
      finance: ["read", "create", "approve"],
      network: ["read", "manage"],
    },
  },
  {
    code: "ceo",
    nameEn: "CEO",
    nameAr: "المدير التنفيذي",
    descriptionEn:
      "Executive oversight across all branches, team management, approvals, and company network.",
    descriptionAr:
      "إشراف تنفيذي شامل على جميع الفروع، إدارة الفريق، الاعتمادات، وشبكة الشركات.",
    scopeType: "company_wide",
    permissions: {
      company: ["read", "update"],
      branches: ["read", "create", "update"],
      team: ["read", "invite", "manage_members"],
      fleet: ["read", "create", "update"],
      purchase_orders: ["read", "create", "update", "approve"],
      vendors: ["read", "create", "update"],
      variants: ["read", "create", "update"],
      vehicle_photos: ["read", "create", "update"],
      rental_inclusions: ["read", "create", "update"],
      sales: ["read", "create", "update"],
      operations: ["read", "create", "update"],
      finance: ["read", "create", "approve"],
      network: ["read", "manage"],
    },
  },
  {
    code: "finance_manager",
    nameEn: "Finance Manager",
    nameAr: "المدير المالي",
    descriptionEn:
      "Approves purchase orders, vendor payouts, and financial adjustments across company branches.",
    descriptionAr:
      "مراجعة واعتماد أوامر الشراء، دفعات الموردين، والتسويات المالية على مستوى فروع الشركة.",
    scopeType: "company_wide",
    permissions: {
      company: [],
      branches: [],
      team: [],
      fleet: ["read"],
      sales: ["read"],
      operations: ["read"],
      finance: ["read", "create", "approve"],
      network: ["read"],
    },
  },
  {
    code: "accountant",
    nameEn: "Accountant",
    nameAr: "محاسب",
    descriptionEn:
      "Records collections, vendor installments, and operational expenses within assigned branches.",
    descriptionAr:
      "تسجيل التحصيلات، أقساط الموردين، والمصروفات التشغيلية ضمن الفروع المحددة له.",
    scopeType: "assigned_branches",
    permissions: {
      company: [],
      branches: [],
      fleet: ["read"],
      sales: ["read"],
      finance: ["read", "create"],
    },
  },
  {
    code: "cashier",
    nameEn: "Cashier",
    nameAr: "كاشير",
    descriptionEn:
      "Handles rental collections, receipts, and branch cash desk operations within assigned branches.",
    descriptionAr:
      "إدارة تحصيلات الإيجار، الإيصالات، وخزينة الفرع ضمن الفروع المحددة له.",
    scopeType: "assigned_branches",
    permissions: {
      company: [],
      branches: [],
      fleet: ["read"],
      sales: ["read", "create"],
      finance: ["read", "create"],
    },
  },
  {
    code: "representative",
    nameEn: "Representative",
    nameAr: "مندوب تشغيل",
    descriptionEn:
      "Manages reservations, vehicle handovers, returns, and incident reports in assigned branches.",
    descriptionAr:
      "متابعة الحجوزات، تسليم واستلام السيارات، وتقارير الحوادث ضمن الفروع المحددة له.",
    scopeType: "assigned_branches",
    permissions: {
      company: [],
      branches: [],
      fleet: ["read", "create", "update"],
      vehicle_photos: ["read", "create", "update"],
      rental_inclusions: ["read", "create", "update"],
      sales: ["read", "create", "update"],
      operations: ["read", "create", "update"],
    },
  },
];

export function hasPermission(
  permissions: PermissionMatrix | undefined,
  resource: PermissionResource,
  action: string,
): boolean {
  if (!permissions) return false;
  const actions = permissions[resource];
  if (!Array.isArray(actions)) return false;
  return actions.includes(action);
}

export function sanitizePermissionMatrix(
  input: PermissionMatrix,
): PermissionMatrix {
  const sanitized: PermissionMatrix = {};
  for (const item of PERMISSION_CATALOG) {
    const raw = input[item.resource];
    if (!Array.isArray(raw)) continue;
    const allowedSet = new Set(item.actions);
    const filtered = Array.from(
      new Set(raw.filter((action) => allowedSet.has(action))),
    );
    if (filtered.length > 0) {
      sanitized[item.resource] = filtered;
    }
  }
  return sanitized;
}
