import type { RevixIconName } from "@/components/ui/RevixIcons";
import type { WorkspaceMembershipDto } from "@/store/api/workspaceApi";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface WorkspaceSubPageItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  shortcut: string;
  keyCode: string; // Single letter after 'g' or direct shortcut in command palette
  badgeEn?: string;
  badgeAr?: string;
  isReady?: boolean; // When true, page is active and visible in navigation
}

export interface WorkspaceSubPageGroup {
  groupTitleEn: string;
  groupTitleAr: string;
  items: WorkspaceSubPageItem[];
}

export interface WorkspaceSectionConfig {
  id: WorkspaceSectionId;
  icon: RevixIconName;
  titleEn: string;
  titleAr: string;
  altShortcut: string;
  groups: WorkspaceSubPageGroup[];
}

export const WORKSPACE_NAVIGATION_SECTIONS: readonly WorkspaceSectionConfig[] =
  [
    {
      id: "overview",
      icon: "layout-dashboard",
      titleEn: "Workspace Overview",
      titleAr: "نظرة عامة",
      altShortcut: "Alt+1",
      groups: [
        {
          groupTitleEn: "DASHBOARD",
          groupTitleAr: "لوحة المتابعة",
          items: [
            {
              id: "summary",
              titleEn: "Company & Branch Summary",
              titleAr: "ملخص الشركة والفروع",
              descEn:
                "Overview of active company identity, branches, and separate branch currencies.",
              descAr:
                "نظرة شاملة على هوية الشركة، الفروع النشطة، واستقلال عملة كل فرع.",
              shortcut: "G O",
              keyCode: "o",
              isReady: true,
            },
            {
              id: "activity",
              titleEn: "Recent Activity & Audit",
              titleAr: "آخر الحركات وسجل المراجعة",
              descEn:
                "Operational activity and audit events across your permitted scope.",
              descAr: "سجل العمليات والأحداث المسجلة داخل نطاق صلاحياتك.",
              shortcut: "G A",
              keyCode: "a",
            },
          ],
        },
      ],
    },
    {
      id: "sales",
      icon: "file-text",
      titleEn: "Sales & Rentals",
      titleAr: "المبيعات والتأجير",
      altShortcut: "Alt+2",
      groups: [
        {
          groupTitleEn: "RENTAL LIFECYCLE",
          groupTitleAr: "رحلة التأجير",
          items: [
            {
              id: "bookings",
              titleEn: "Reservations & Bookings",
              titleAr: "الحجوزات وطلبات التأجير",
              descEn:
                "Track customer inquiries, availability, and duration-band pricing (1–2, 3–7, 8–30+ days).",
              descAr:
                "متابعة الحجوزات والتوفر وحساب شرائح الإيجار اليومي (١–٢، ٣–٧، ٨–٣٠+ يوم).",
              shortcut: "G B",
              keyCode: "b",
              badgeEn: "Phase 6",
              badgeAr: "المرحلة ٦",
            },
            {
              id: "contracts",
              titleEn: "Rental Agreements",
              titleAr: "عقود الإيجار والتسليم",
              descEn:
                "Vehicle assignment, rental contracts, handover checklists, and returns.",
              descAr:
                "تخصيص السيارات، عقود التأجير، ومحاضر التسليم والاسترجاع.",
              shortcut: "G R",
              keyCode: "r",
              badgeEn: "Phase 6",
              badgeAr: "المرحلة ٦",
            },
          ],
        },
        {
          groupTitleEn: "DIRECTORY",
          groupTitleAr: "العملاء",
          items: [
            {
              id: "customers",
              titleEn: "Customers",
              titleAr: "سجل العملاء",
              descEn:
                "Company-isolated customer profiles, documents, and rental history.",
              descAr: "بيانات العملاء ومستنداتهم وسجل تعاملاتهم المعزول لشركتك.",
              shortcut: "G U",
              keyCode: "u",
              badgeEn: "Phase 6",
              badgeAr: "المرحلة ٦",
            },
          ],
        },
      ],
    },
    {
      id: "fleet",
      icon: "car-front",
      titleEn: "Purchasing & Fleet",
      titleAr: "الشراء والأسطول",
      altShortcut: "Alt+3",
      groups: [
        {
          groupTitleEn: "ACQUISITION (PO)",
          groupTitleAr: "المشتريات والموردون",
          items: [
            {
              id: "purchase-orders",
              titleEn: "Purchase Orders (PO)",
              titleAr: "أوامر شراء السيارات (PO)",
              descEn:
                "Total vendor amount, upfront paid, remaining installments, and partial vehicle receiving.",
              descAr:
                "إجمالي المبلغ للمورد، المدفوع مقدمًا، المتبقي بالأقساط، والاستلام الجزئي للسيارات.",
              shortcut: "G P",
              keyCode: "p",
              isReady: true,
            },
            {
              id: "vendors",
              titleEn: "Vendors Directory",
              titleAr: "دليل الموردين",
              descEn:
                "Company-isolated suppliers, contact persons, payment methods, and terms.",
              descAr:
                "قائمة الموردين الخاصة بشركتك، مسؤولي التواصل، وطرق الدفع والشروط.",
              shortcut: "G D",
              keyCode: "d",
              isReady: true,
            },
            {
              id: "variants",
              titleEn: "Vehicle Variants (Templates)",
              titleAr: "كتالوج فئات السيارات (الفريان)",
              descEn:
                "Model specifications, SIPP codes, and daily rental rate bands (model templates, not physical cars).",
              descAr:
                "تعريف قوالب الموديلات، كود SIPP العالمي، وشرائح أسعار التأجير اليومي (قوالب الفئات وليس سيارات فردية).",
              shortcut: "G T",
              keyCode: "t",
              isReady: true,
            },
          ],
        },
        {
          groupTitleEn: "FLEET ASSETS",
          groupTitleAr: "الأسطول والتسعير",
          items: [
            {
              id: "vehicles",
              titleEn: "Fleet Vehicles Register",
              titleAr: "سجل سيارات الأسطول",
              descEn:
                "Browse fleet assets, availability status, daily rates, and quick operations.",
              descAr:
                "استعراض سيارات الأسطول وحالتها التشغيلية والأسعار اليومية والعمليات السريعة.",
              shortcut: "G F",
              keyCode: "f",
              isReady: true,
            },
            {
              id: "add-vehicle",
              titleEn: "Add Fleet Vehicle",
              titleAr: "إضافة سيارة للأصول",
              descEn:
                "Dedicated page to register a vehicle into fleet assets (from purchase order or direct entry).",
              descAr:
                "صفحة مخصصة لتسجيل وإضافة سيارة للأصول (تحويل من أمر شراء أو إضافة مباشرة).",
              shortcut: "G A",
              keyCode: "a",
              isReady: true,
            },
            {
              id: "vehicle-photos",
              titleEn: "Vehicle Photos Catalog",
              titleAr: "مكتبة وصور السيارات",
              descEn:
                "Upload and manage verified vehicle photography for dynamic fleet matching.",
              descAr:
                "رفع وإدارة مكتبة صور السيارات للربط التلقائي والديناميكي مع الأسطول.",
              shortcut: "G H",
              keyCode: "h",
              isReady: true,
            },
            {
              id: "rental-inclusions",
              titleEn: "Rental Inclusions (What is included)",
              titleAr: "مزايا وتغطيات العقود (Inclusions)",
              descEn:
                "Manage contract inclusions, insurance, and rental benefits catalog.",
              descAr:
                "إدارة وتعريف مزايا وتغطيات عقود التأجير المشمولة (What is included).",
              shortcut: "G I",
              keyCode: "i",
              isReady: true,
            },
          ],
        },
      ],
    },
    {
      id: "operations",
      icon: "wrench",
      titleEn: "Operations & Incidents",
      titleAr: "الأوبريشن والحوادث",
      altShortcut: "Alt+4",
      groups: [
        {
          groupTitleEn: "FLEET READINESS",
          groupTitleAr: "جاهزية التشغيل",
          items: [
            {
              id: "readiness",
              titleEn: "Readiness & Maintenance",
              titleAr: "الجاهزية والصيانة والتأمين",
              descEn:
                "Track maintenance, insurance validity, and inter-branch vehicle movements.",
              descAr: "متابعة الصيانة الدورية، سريان التأمين، وحركة السيارات بين الفروع.",
              shortcut: "G W",
              keyCode: "w",
              badgeEn: "Phase 7",
              badgeAr: "المرحلة ٧",
            },
            {
              id: "incidents",
              titleEn: "Accidents & Evidence",
              titleAr: "الحوادث والمرفقات",
              descEn:
                "Record rental accidents, private evidence photos, repair workflow, and liability determination.",
              descAr:
                "تسجيل الحوادث وصور الأدلة الخاصة ومتابعة الإصلاح وتحديد المسؤولية المالية.",
              shortcut: "G I",
              keyCode: "i",
              badgeEn: "Phase 7",
              badgeAr: "المرحلة ٧",
            },
          ],
        },
      ],
    },
    {
      id: "finance",
      icon: "wallet",
      titleEn: "Finance & Approvals",
      titleAr: "المالية والاعتمادات",
      altShortcut: "Alt+5",
      groups: [
        {
          groupTitleEn: "APPROVALS & OBLIGATIONS",
          groupTitleAr: "الاعتمادات والالتزامات",
          items: [
            {
              id: "approvals",
              titleEn: "Finance Manager Approvals",
              titleAr: "اعتمادات المدير المالي",
              descEn:
                "Approve or reject PO financial commitments, vendor payouts, and adjustments.",
              descAr:
                "مراجعة واعتماد أو رفض أوامر الشراء ودفعات الموردين والتسويات المالية.",
              shortcut: "G F",
              keyCode: "f",
              badgeEn: "Phase 8",
              badgeAr: "المرحلة ٨",
            },
            {
              id: "installments",
              titleEn: "Vendor Installments & Dues",
              titleAr: "أقساط ومستحقات الموردين",
              descEn:
                "Track paid upfront amounts, remaining balances, and scheduled vendor installments.",
              descAr: "متابعة المبالغ المدفوعة والمتبقية وجدول أقساط الموردين.",
              shortcut: "G Q",
              keyCode: "q",
              badgeEn: "Phase 8",
              badgeAr: "المرحلة ٨",
            },
          ],
        },
        {
          groupTitleEn: "BRANCH CURRENCY REPORTS",
          groupTitleAr: "التقارير حسب عملة الفرع",
          items: [
            {
              id: "branch-balances",
              titleEn: "Branch & Vehicle Balances",
              titleAr: "أرصدة الفروع والسيارات",
              descEn:
                "Income and expenses reported strictly in each branch's native currency without mixing.",
              descAr:
                "تقارير الإيرادات والمصروفات لكل فرع بعملته المستقلة بدون خلط العملات.",
              shortcut: "G E",
              keyCode: "e",
              badgeEn: "Phase 8",
              badgeAr: "المرحلة ٨",
            },
          ],
        },
      ],
    },
    {
      id: "network",
      icon: "network",
      titleEn: "Company Network",
      titleAr: "شبكة الشركات المحلية",
      altShortcut: "Alt+6",
      groups: [
        {
          groupTitleEn: "PARTNER NETWORK",
          groupTitleAr: "إدارة الشبكة",
          items: [
            {
              id: "local-companies",
              titleEn: "Connected Partners",
              titleAr: "الشركات الشريكة",
              descEn:
                "View-only access to connected local companies' permitted branches, vehicles, and contact info.",
              descAr:
                "عرض فقط (بدون تعديل) لسيارات وفروع وبيانات تواصل الشركات المحلية المرتبطة.",
              shortcut: "G N",
              keyCode: "n",
              isReady: true,
            },
          ],
        },
      ],
    },
    {
      id: "team",
      icon: "users-round",
      titleEn: "Team & Permissions",
      titleAr: "الموظفون والصلاحيات",
      altShortcut: "Alt+7",
      groups: [
        {
          groupTitleEn: "ACCESS CONTROL",
          groupTitleAr: "فريق العمل والأدوار",
          items: [
            {
              id: "members",
              titleEn: "Employees & Invitations",
              titleAr: "الموظفون والدعوات",
              descEn:
                "Invite employees (1 company per email, 1 role per employee) and assign branch scope.",
              descAr:
                "دعوة الموظفين (شركة واحدة لكل إيميل، ودور واحد لكل موظف) وتحديد الفرع.",
              shortcut: "G E",
              keyCode: "e",
              isReady: true,
            },
            {
              id: "roles",
              titleEn: "Roles & Scope Matrix",
              titleAr: "الأدوار ونطاق الصلاحيات",
              descEn:
                "Configurable role permissions (Owner, CEO, Finance Manager, Accountant, Cashier, Representative).",
              descAr:
                "جدول الصلاحيات المرن للأدوار (المالك، المدير التنفيذي، المدير المالي، المحاسب، الكاشير، المندوب).",
              shortcut: "G R",
              keyCode: "r",
              isReady: true,
            },
          ],
        },
      ],
    },
    {
      id: "settings",
      icon: "settings",
      titleEn: "Company Settings",
      titleAr: "إعدادات الشركة والفروع",
      altShortcut: "Alt+8",
      groups: [
        {
          groupTitleEn: "MANAGE",
          groupTitleAr: "إدارة الفروع والشركة",
          items: [
            {
              id: "company-profile",
              titleEn: "Company Profile & Brand",
              titleAr: "بيانات وهوية الشركة",
              descEn:
                "Update company name, legal entity, brand color, reference currency, and registration details.",
              descAr:
                "تحديث اسم الشركة، الاسم القانوني، لون البراند، العملة المرجعية، والسجل التجاري والضريبي.",
              shortcut: "G C",
              keyCode: "c",
              isReady: true,
            },
            {
              id: "locations",
              titleEn: "Branches & Locations",
              titleAr: "الفروع واللوكيشنات",
              descEn:
                "Manage company locations, branch codes, country-specific currencies, and working hours.",
              descAr:
                "إدارة مواقع وفروع الشركة، أكواد الفروع، عملة كل فرع حسب دولته، ومواعيد العمل.",
              shortcut: "G L",
              keyCode: "l",
              isReady: true,
            },
          ],
        },
        {
          groupTitleEn: "SECURITY",
          groupTitleAr: "الحساب والأمان",
          items: [
            {
              id: "security",
              titleEn: "Account & Password",
              titleAr: "الأمان وكلمة المرور",
              descEn:
                "Manage your signed-in account credentials and change your password.",
              descAr: "إدارة بيانات حسابك الشخصي وتغيير كلمة المرور.",
              shortcut: "G S",
              keyCode: "s",
              isReady: true,
            },
          ],
        },
      ],
    },
  ];

/**
 * Filtered list of navigation sections that only include currently ready, functional pages.
 * Modules/subpages from future roadmap phases remain shelved until their phase is implemented.
 */
export const READY_WORKSPACE_NAVIGATION_SECTIONS: readonly WorkspaceSectionConfig[] =
  WORKSPACE_NAVIGATION_SECTIONS.map((sec) => {
    const readyGroups = sec.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.isReady === true),
      }))
      .filter((g) => g.items.length > 0);

    return {
      ...sec,
      groups: readyGroups,
    };
  })
    .filter((sec) => sec.groups.length > 0)
    .map((sec, idx) => ({
      ...sec,
      altShortcut: `Alt+${idx + 1}`,
    }));

export function isOwnerOrCeo(membership?: WorkspaceMembershipDto | null): boolean {
  return !membership || membership.roleCode === "owner" || membership.roleCode === "ceo";
}

export function canAccessWorkspacePage(
  sectionId: WorkspaceSectionId,
  subPageId: string,
  operatingMode?: "independent" | "network_main" | "local_partner",
  membership?: WorkspaceMembershipDto | null,
): boolean {
  if (sectionId === "network") {
    if (operatingMode === "independent") return false;
    return (
      isOwnerOrCeo(membership) ||
      Boolean(membership?.permissions.network?.includes("read"))
    );
  }

  if (sectionId === "team") {
    return isOwnerOrCeo(membership);
  }

  if (sectionId === "settings") {
    if (subPageId === "security") return true;
    if (subPageId === "company-profile") {
      return (
        isOwnerOrCeo(membership) ||
        Boolean(membership?.permissions.company?.includes("read"))
      );
    }
    if (subPageId === "locations") {
      return (
        isOwnerOrCeo(membership) ||
        Boolean(membership?.permissions.branches?.includes("read"))
      );
    }
    return isOwnerOrCeo(membership);
  }

  if (sectionId === "fleet") {
    if (isOwnerOrCeo(membership)) return true;
    const perms = membership?.permissions;
    if (subPageId === "add-vehicle") {
      return Boolean(perms?.fleet?.includes("create"));
    }
    if (subPageId === "purchase-orders") {
      return Boolean(
        perms?.purchase_orders?.includes("read") &&
          (perms?.purchase_orders?.includes("create") ||
            perms?.purchase_orders?.includes("approve")),
      );
    }
    if (subPageId === "vendors") {
      return Boolean(
        perms?.vendors?.includes("read") && perms?.vendors?.includes("create"),
      );
    }
    if (subPageId === "variants") {
      return Boolean(
        perms?.variants?.includes("read") && perms?.variants?.includes("create"),
      );
    }
    if (subPageId === "vehicle-photos") {
      return Boolean(perms?.vehicle_photos?.includes("read"));
    }
    if (subPageId === "rental-inclusions") {
      return Boolean(perms?.rental_inclusions?.includes("read"));
    }
    return Boolean(perms?.fleet?.includes("read"));
  }

  if (sectionId === "sales") {
    if (!membership) return true;
    return Boolean(membership.permissions.sales?.includes("read"));
  }

  if (sectionId === "operations") {
    if (!membership) return true;
    return Boolean(membership.permissions.operations?.includes("read"));
  }

  if (sectionId === "finance") {
    if (!membership) return true;
    return Boolean(membership.permissions.finance?.includes("read"));
  }

  return true;
}

/**
 * Dynamic navigation sections filtered by operating mode and role permissions.
 */
export function getReadyWorkspaceNavigationSections(
  operatingMode?: "independent" | "network_main" | "local_partner",
  membership?: WorkspaceMembershipDto | null,
): WorkspaceSectionConfig[] {
  return READY_WORKSPACE_NAVIGATION_SECTIONS.map((sec) => {
    const filteredGroups = sec.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          canAccessWorkspacePage(sec.id, item.id, operatingMode, membership),
        ),
      }))
      .filter((g) => g.items.length > 0);

    return {
      ...sec,
      groups: filteredGroups,
    };
  })
    .filter((sec) => sec.groups.length > 0)
    .map((sec, idx) => ({
      ...sec,
      altShortcut: `Alt+${idx + 1}`,
    }));
}

export function parseWorkspaceSlug(slug?: string[]): {
  section: WorkspaceSectionId;
  subPage: string;
} {
  if (!slug || slug.length === 0) {
    return { section: "overview", subPage: "summary" };
  }

  const [rawSection, rawSubPage] = slug;
  const matchedSection = WORKSPACE_NAVIGATION_SECTIONS.find(
    (sec) => sec.id === rawSection,
  );
  if (!matchedSection) {
    return { section: "overview", subPage: "summary" };
  }

  const allSubPages = matchedSection.groups.flatMap((g) =>
    g.items.map((item) => item.id),
  );
  const resolvedSubPage =
    rawSubPage && allSubPages.includes(rawSubPage)
      ? rawSubPage
      : allSubPages[0] ?? "summary";

  return {
    section: matchedSection.id,
    subPage: resolvedSubPage,
  };
}

export function parseWorkspacePathname(pathname: string): {
  section: WorkspaceSectionId;
  subPage: string;
} {
  const clean = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts[0] !== "workspace") {
    return { section: "overview", subPage: "summary" };
  }
  return parseWorkspaceSlug(parts.slice(1));
}

export function buildWorkspaceHref(
  section: WorkspaceSectionId,
  subPage: string,
): string {
  if (section === "overview" && subPage === "summary") {
    return "/workspace";
  }
  return `/workspace/${section}/${subPage}`;
}
