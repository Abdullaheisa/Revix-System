"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { StudioBadge } from "@/components/shared/workspace";
import { extractApiErrorCode } from "@/store/api/baseApi";
import {
  useGetTeamOverviewQuery,
  useUpdateRoleMutation,
  type CompanyRoleDto,
  type PermissionMatrix,
  type RoleScopeType,
} from "@/store/api/teamApi";
import type { WorkspaceMembershipDto } from "@/store/api/workspaceApi";

export interface RolesMatrixPanelProps {
  isRtl: boolean;
  membership: WorkspaceMembershipDto | null;
}

const RESOURCE_ROWS = [
  {
    key: "company",
    en: "Company Profile",
    ar: "بيانات الشركة",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "branches",
    en: "Branches & Locations",
    ar: "الفروع واللوكيشنات",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "team",
    en: "Team & Roles",
    ar: "الموظفون والأدوار",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "invite", en: "Invite", ar: "دعوة" },
      { key: "manage_members", en: "Edit members", ar: "تعديل الموظفين" },
      { key: "manage_roles", en: "Edit roles", ar: "تعديل الصلاحيات" },
    ],
  },
  {
    key: "fleet",
    en: "Fleet Vehicles & Add Vehicle",
    ar: "سجل سيارات الأسطول وإضافة سيارة",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Add Vehicle", ar: "إضافة سيارة" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "purchase_orders",
    en: "Purchase Orders (PO)",
    ar: "أوامر شراء السيارات (PO)",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create Request", ar: "إنشاء طلب" },
      { key: "update", en: "Edit", ar: "تعديل" },
      { key: "approve", en: "Approve Immediately", ar: "اعتماد فوري" },
    ],
  },
  {
    key: "vendors",
    en: "Vendors Directory",
    ar: "دليل الموردين",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "variants",
    en: "Vehicle Variants (Templates)",
    ar: "كتالوج فئات السيارات (الفريان)",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "vehicle_photos",
    en: "Vehicle Photos Catalog",
    ar: "مكتبة وصور السيارات",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Upload", ar: "رفع" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "rental_inclusions",
    en: "Rental Inclusions",
    ar: "مزايا وتغطيات العقود",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "sales",
    en: "Sales & Rentals",
    ar: "المبيعات وعقود التأجير",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "operations",
    en: "Operations & Incidents",
    ar: "التشغيل والصيانة والحوادث",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Create", ar: "إنشاء" },
      { key: "update", en: "Edit", ar: "تعديل" },
    ],
  },
  {
    key: "finance",
    en: "Finance & Approvals",
    ar: "المالية والاعتمادات",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "create", en: "Record", ar: "تسجيل" },
      { key: "approve", en: "Approve", ar: "اعتماد" },
    ],
  },
  {
    key: "network",
    en: "Company Network",
    ar: "شبكة الشركات المحلية",
    actions: [
      { key: "read", en: "View", ar: "عرض" },
      { key: "manage", en: "Manage links", ar: "إدارة الربط" },
    ],
  },
] as const;

export function RolesMatrixPanel({ isRtl, membership }: RolesMatrixPanelProps) {
  const { data, isLoading, error } = useGetTeamOverviewQuery();
  const [updateRole, { isLoading: isSaving }] = useUpdateRoleMutation();

  const roles = useMemo(() => data?.data.roles ?? [], [data?.data.roles]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [draftScope, setDraftScope] = useState<RoleScopeType | null>(null);
  const [draftPermissions, setDraftPermissions] =
    useState<PermissionMatrix | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | undefined>();
  const [errorNotice, setErrorNotice] = useState<string | undefined>();

  const canManageRoles =
    !membership ||
    Boolean(membership.permissions.team?.includes("manage_roles"));

  const activeRole: CompanyRoleDto | undefined = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  }, [roles, selectedRoleId]);

  const effectiveScope: RoleScopeType =
    draftScope ?? activeRole?.scopeType ?? "assigned_branches";
  const effectivePermissions: PermissionMatrix =
    draftPermissions ?? activeRole?.permissions ?? {};

  const isLocked = activeRole?.code === "owner" || !canManageRoles;

  function handleSelectRole(role: CompanyRoleDto) {
    setSelectedRoleId(role.id);
    setDraftScope(null);
    setDraftPermissions(null);
    setSavedNotice(undefined);
    setErrorNotice(undefined);
  }

  function handleToggleAction(resource: string, action: string) {
    if (isLocked || !activeRole) return;
    const base = draftPermissions ?? activeRole.permissions;
    const currentList = base[resource] ?? [];
    const nextList = currentList.includes(action)
      ? currentList.filter((a) => a !== action)
      : [...currentList, action];

    setDraftPermissions({
      ...base,
      [resource]: nextList,
    });
  }

  async function handleSave() {
    if (!activeRole || isLocked) return;
    setSavedNotice(undefined);
    setErrorNotice(undefined);

    try {
      await updateRole({
        roleId: activeRole.id,
        scopeType: effectiveScope,
        permissions: effectivePermissions,
      }).unwrap();
      setDraftScope(null);
      setDraftPermissions(null);
      setSavedNotice(
        isRtl
          ? `تم حفظ صلاحيات دور «${activeRole.nameAr}» بنجاح.`
          : `Saved permissions for ${activeRole.nameEn}.`,
      );
    } catch {
      setErrorNotice(
        isRtl
          ? "تعذّر حفظ صلاحيات الدور. يرجى المحاولة مرة أخرى."
          : "Unable to save role permissions.",
      );
    }
  }

  if (error) {
    const code = extractApiErrorCode(error);
    return (
      <div className="max-w-[720px]">
        <Alert
          variant="error"
          title={isRtl ? "صلاحيات غير كافية" : "Access restricted"}
          message={
            code === "FORBIDDEN"
              ? isRtl
                ? "دورك الحالي لا يملك صلاحية عرض مصفوفة الأدوار."
                : "Your current role does not have permission to view the role matrix."
              : isRtl
                ? "تعذّر تحميل الأدوار."
                : "Unable to load roles."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
          {isRtl ? "الأدوار ونطاق الصلاحيات" : "Roles & Scope Matrix"}
        </h1>
        <p className="mt-0.5 text-[13px] text-revix-secondary">
          {isRtl
            ? "تحكم مرن في صلاحيات كل دور ونطاقه (على مستوى الشركة بالكامل أو فروع محددة) بدون تعديل قاعدة البيانات."
            : "Configure each role's scope (company-wide vs. assigned branches) and module permissions enforced on every API call."}
        </p>
      </div>

      {savedNotice ? (
        <Alert
          variant="success"
          title={isRtl ? "تم الحفظ" : "Saved"}
          message={savedNotice}
          onClose={() => setSavedNotice(undefined)}
        />
      ) : null}

      {errorNotice ? (
        <Alert
          variant="error"
          title={isRtl ? "خطأ" : "Error"}
          message={errorNotice}
          onClose={() => setErrorNotice(undefined)}
        />
      ) : null}

      {isLoading || !activeRole ? (
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-8 text-center text-[13px] text-revix-secondary">
          {isRtl ? "جاري تحميل مصفوفة الأدوار..." : "Loading role matrix..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          {/* Role Selector Rail */}
          <div className="space-y-1.5 rounded-[8px] border border-revix-border bg-revix-white p-2.5">
            {roles.map((role) => {
              const selected = role.id === activeRole.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-[6px] px-3 py-2.5 text-start transition-colors ${
                    selected
                      ? "bg-revix-tint text-revix-primary"
                      : "text-revix-dark hover:bg-revix-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold">
                      {isRtl ? role.nameAr : role.nameEn}
                    </div>
                    <div className="text-[11.5px] text-revix-secondary">
                      {role.scopeType === "company_wide"
                        ? isRtl
                          ? "جميع الفروع"
                          : "Company-wide"
                        : isRtl
                          ? "فروع محددة"
                          : "Assigned branches"}
                    </div>
                  </div>
                  {role.code === "owner" ? (
                    <StudioBadge variant="primary">
                      {isRtl ? "مغلق" : "Locked"}
                    </StudioBadge>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Role Details & Permission Matrix */}
          <div className="rounded-[8px] border border-revix-border bg-revix-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-revix-border pb-4">
              <div>
                <h2 className="text-[16px] font-semibold text-revix-dark">
                  {isRtl ? activeRole.nameAr : activeRole.nameEn}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-revix-secondary">
                  {isRtl ? activeRole.descriptionAr : activeRole.descriptionEn}
                </p>
              </div>

              {!isLocked ? (
                <Button
                  type="button"
                  className="!min-h-[36px] !px-3.5 !py-1.5 text-[13px]"
                  isLoading={isSaving}
                  disabled={!draftScope && !draftPermissions}
                  onClick={handleSave}
                >
                  {isRtl ? "حفظ الصلاحيات" : "Save permissions"}
                </Button>
              ) : null}
            </div>

            {/* Scope Selector */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[8px] border border-revix-border bg-revix-surface p-3">
              <span className="text-[12.5px] font-semibold text-revix-dark">
                {isRtl ? "نطاق الوصول:" : "Access scope:"}
              </span>
              {(["company_wide", "assigned_branches"] as const).map((scope) => {
                const active = effectiveScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setDraftScope(scope)}
                    className={`cursor-pointer rounded-[6px] border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                      active
                        ? "border-revix-primary bg-revix-tint text-revix-primary"
                        : "border-revix-border bg-revix-white text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {scope === "company_wide"
                      ? isRtl
                        ? "على مستوى الشركة بالكامل"
                        : "Company-wide (all branches)"
                      : isRtl
                        ? "فروع محددة فقط"
                        : "Assigned branches only"}
                  </button>
                );
              })}
            </div>

            {/* Matrix */}
            <div className="mt-4 divide-y divide-revix-border rounded-[8px] border border-revix-border">
              {RESOURCE_ROWS.map((row) => {
                const granted = effectivePermissions[row.key] ?? [];
                return (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="text-[13px] font-semibold text-revix-dark">
                      {isRtl ? row.ar : row.en}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.actions.map((action) => {
                        const checked = granted.includes(action.key);
                        return (
                          <label
                            key={action.key}
                            className={`flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                              isLocked
                                ? "cursor-not-allowed opacity-75"
                                : "cursor-pointer"
                            } ${
                              checked
                                ? "border-revix-primary bg-revix-tint text-revix-primary"
                                : "border-revix-border bg-revix-white text-revix-secondary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isLocked}
                              onChange={() =>
                                handleToggleAction(row.key, action.key)
                              }
                              className="h-3.5 w-3.5 accent-revix-primary"
                            />
                            <span>{isRtl ? action.ar : action.en}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
