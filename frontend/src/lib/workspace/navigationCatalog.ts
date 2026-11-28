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
              titleEn: "Departments",
              titleAr: "الإدارات",
              descEn: "Departments hub and quick access to CRM, Operations, Finance, Asset, and Sales.",
              descAr: "صفحة الإدارات والوصول السريع إلى CRM و Operations و Finance و Asset و Sales.",
              shortcut: "G O",
              keyCode: "o",
              isReady: true,
            },
            {
              id: "crm",
              titleEn: "CRM",
              titleAr: "CRM — علاقات العملاء",
              descEn: "Customers, rental contracts, and contract terms.",
              descAr: "إدارة العملاء وعقودهم وشروط التعاقد.",
              shortcut: "G 1",
              keyCode: "1",
            },
            {
              id: "operations",
              titleEn: "Operations",
              titleAr: "Operations — التشغيل",
              descEn: "Vehicle movements, drivers, calendar, maintenance, and incidents.",
              descAr: "حركة السيارات والسائقين والتقويم والصيانة والحوادث.",
              shortcut: "G 2",
              keyCode: "2",
            },
            {
              id: "finance",
              titleEn: "Finance",
              titleAr: "Finance — المالية",
              descEn: "Purchase orders, pricing, vendors, insurance, and approvals.",
              descAr: "أوامر الشراء والأسعار والموردين والتأمين والاعتمادات.",
              shortcut: "G 3",
              keyCode: "3",
            },
            {
              id: "asset",
              titleEn: "Asset",
              titleAr: "Asset — الأصول",
              descEn: "Fleet vehicles, variants, models, body styles, colors, and photos.",
              descAr: "أصول السيارات والفئات والموديلات والهياكل والألوان والصور.",
              shortcut: "G 4",
              keyCode: "4",
            },
            {
              id: "sales",
              titleEn: "Sales",
              titleAr: "Sales — المبيعات",
              descEn: "Rental contracts, booking calendar, pricing, and inclusions.",
              descAr: "عقود التأجير وتقويم الحجوزات والأسعار والمزايا.",
              shortcut: "G 5",
              keyCode: "5",
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
          groupTitleEn: "1. MASTER",
          groupTitleAr: "١. الماستر (MASTER)",
          items: [
            {
              id: "body-styles",
              titleEn: "Body Style",
              titleAr: "هيكل السيارة (Body Style)",
              descEn: "Manage vehicle body styles and category codes.",
              descAr: "تعريف أنواع هياكل وفئات السيارات.",
              shortcut: "G B",
              keyCode: "b",
              isReady: true,
            },
            {
              id: "models",
              titleEn: "Model",
              titleAr: "الموديلات (Model)",
              descEn: "Vehicle manufacturers and models catalog.",
              descAr: "تعريف الشركات المصنعة وموديلات السيارات.",
              shortcut: "G Q",
              keyCode: "q",
              isReady: true,
            },
            {
              id: "colors",
              titleEn: "Colors",
              titleAr: "الألوان (Colors)",
              descEn: "Exterior and interior vehicle colors catalog.",
              descAr: "تعريف الألوان الخارجية والداخلية للسيارات.",
              shortcut: "G K",
              keyCode: "k",
              isReady: true,
            },
            {
              id: "variants",
              titleEn: "Model Variant Master",
              titleAr: "فئات السيارات (Model Variant Master)",
              descEn: "Model specifications and templates.",
              descAr: "تعريف قوالب الفئات والمواصفات الأساسية.",
              shortcut: "G T",
              keyCode: "t",
              isReady: true,
            },
            {
              id: "vehicle-photos",
              titleEn: "Vehicle Photos Catalog",
              titleAr: "مكتبة وصور السيارات",
              descEn: "Upload and manage verified vehicle photography.",
              descAr: "رفع وإدارة مكتبة صور السيارات.",
              shortcut: "G H",
              keyCode: "h",
              isReady: true,
            },
            {
              id: "rental-inclusions",
              titleEn: "What's Included",
              titleAr: "What's Included",
              descEn: "Manage what's included in rental packages.",
              descAr: "إدارة المزايا والتغطيات المشمولة في الإيجار.",
              shortcut: "G X",
              keyCode: "x",
              isReady: true,
            },
            {
              id: "add-vehicle",
              titleEn: "Add Vehicle",
              titleAr: "إضافة سيارة (Add Vehicle)",
              descEn: "Register a vehicle into fleet assets.",
              descAr: "تسجيل وإضافة سيارة للأصول.",
              shortcut: "G A",
              keyCode: "a",
              isReady: true,
            },
            {
              id: "vehicles",
              titleEn: "Vehicle Assets",
              titleAr: "أصول السيارات (Vehicle Assets)",
              descEn: "Browse all fleet vehicles, status, and profiles.",
              descAr: "استعراض كافة سيارات الأسطول وحالتها وملفاتها.",
              shortcut: "G F",
              keyCode: "f",
              isReady: true,
            },
            {
              id: "price-list",
              titleEn: "Price List",
              titleAr: "قائمة الأسعار (Price List)",
              descEn: "Manage spot, airport, and leasing price lists and rates.",
              descAr: "إنشاء وإدارة قوائم الأسعار الفورية وأسعار الفئات.",
              shortcut: "G Y",
              keyCode: "y",
              isReady: true,
            },
          ],
        },
        {
          groupTitleEn: "2. PURCHASING & OPERATIONS",
          groupTitleAr: "٢. المشتريات والتشغيل",
          items: [
            {
              id: "vendors",
              titleEn: "Vendors Directory",
              titleAr: "دليل الموردين",
              descEn: "Company suppliers and contacts.",
              descAr: "دليل الموردين وبيانات التواصل.",
              shortcut: "G D",
              keyCode: "d",
              isReady: true,
            },
            {
              id: "purchase-orders",
              titleEn: "Purchase Orders (PO)",
              titleAr: "أوامر شراء السيارات (PO)",
              descEn: "Purchase orders, payments, and vehicle receiving.",
              descAr: "أوامر الشراء والدفعات واستلام السيارات.",
              shortcut: "G P",
              keyCode: "p",
              isReady: true,
            },
            {
              id: "insurance-companies",
              titleEn: "Insurance Companies",
              titleAr: "شركات التأمين",
              descEn: "Insurance providers and policies.",
              descAr: "دليل شركات التأمين وبوالص السيارات.",
              shortcut: "G I",
              keyCode: "i",
              isReady: true,
            },
            {
              id: "drivers",
              titleEn: "Driver Assignment",
              titleAr: "السائقون وتخصيص السائق",
              descEn: "Fleet drivers directory, licenses, and movement assignment.",
              descAr: "سجل السائقين ورخص القيادة وتخصيصهم لتحركات الأسطول.",
              shortcut: "G V",
              keyCode: "v",
              isReady: true,
            },
            {
              id: "movements",
              titleEn: "Vehicle Movement",
              titleAr: "حركة ونقل السيارات",
              descEn: "Dispatch and receive vehicle movements across branches.",
              descAr: "إرسال واستلام تحركات السيارات بين الفروع.",
              shortcut: "G M",
              keyCode: "m",
              isReady: true,
            },
          ],
        },
        {
          groupTitleEn: "3. RENTALS & CONTRACTS",
          groupTitleAr: "٣. الحجوزات والعقود",
          items: [
            {
              id: "customers",
              titleEn: "Customers",
              titleAr: "العملاء",
              descEn: "Renter directory, national IDs, and driver licenses.",
              descAr: "دليل العملاء وبيانات الهوية ورخص القيادة.",
              shortcut: "G C",
              keyCode: "c",
              isReady: true,
            },
            {
              id: "rental-contracts",
              titleEn: "Rental Contracts",
              titleAr: "عقود التأجير",
              descEn: "Create, track, and close vehicle rental contracts.",
              descAr: "إنشاء وإدارة عقود التأجير واستلام السيارات.",
              shortcut: "G R",
              keyCode: "r",
              isReady: true,
            },
            {
              id: "rental-calendar",
              titleEn: "Rental Calendar",
              titleAr: "تقويم الحجوزات",
              descEn: "Monthly booking timeline per vehicle.",
              descAr: "عرض جدول حجوزات كل سيارة بالمدة والتواريخ.",
              shortcut: "G K",
              keyCode: "k",
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
            {
              id: "contract-terms",
              titleEn: "Contract Terms & Conditions",
              titleAr: "شروط وأحكام العقود",
              descEn:
                "Manage bilingual contract terms and clauses printed automatically on rental agreements.",
              descAr:
                "إدارة بنود وشروط عقد الإيجار بالعربية والإنجليزية للطباعة التلقائية في العقود.",
              shortcut: "G T",
              keyCode: "t",
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
    if (operatingMode !== "network_main") return false;
    return (
      isOwnerOrCeo(membership) ||
      Boolean(membership?.permissions.network?.includes("read"))
    );
  }
  if (sectionId === "fleet" && subPageId === "movements" && operatingMode === "local_partner") {
    return false;
  }

  if (sectionId === "team") {
    return isOwnerOrCeo(membership);
  }

  if (sectionId === "settings") {
    if (subPageId === "security") return true;
    if (subPageId === "company-profile" || subPageId === "contract-terms") {
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
    if (subPageId === "vendors" || subPageId === "insurance-companies") {
      return Boolean(perms?.vendors?.includes("read"));
    }
    if (subPageId === "price-list") {
      return Boolean(
        perms?.price_lists?.includes("read") || perms?.finance?.includes("read"),
      );
    }
    if (subPageId === "rental-contracts" || subPageId === "rental-calendar" || subPageId === "customers") {
      return Boolean(perms?.sales?.includes("read"));
    }
    if (subPageId === "create-contract") {
      return Boolean(perms?.sales?.includes("create"));
    }
    if (subPageId === "movements" || subPageId === "drivers") {
      return Boolean(
        perms?.operations?.includes("read") || perms?.fleet?.includes("create"),
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
