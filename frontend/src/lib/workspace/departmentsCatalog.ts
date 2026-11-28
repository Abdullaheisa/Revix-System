import type { RevixIconName } from "@/components/ui/RevixIcons";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export type DepartmentId = "crm" | "operations" | "finance" | "asset" | "sales";

export interface DepartmentModuleLink {
  section: WorkspaceSectionId;
  subPage: string;
  icon: RevixIconName;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  isUpcoming?: boolean;
}

export interface DepartmentDefinition {
  id: DepartmentId;
  icon: RevixIconName;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descAr: string;
  descEn: string;
  modules: DepartmentModuleLink[];
}

export const WORKSPACE_DEPARTMENTS: readonly DepartmentDefinition[] = [
  {
    id: "crm",
    icon: "users-round",
    titleAr: "CRM",
    titleEn: "CRM",
    subtitleAr: "العملاء وعقودهم وشروط التعاقد",
    subtitleEn: "Customers, contracts & terms",
    descAr: "إدارة ملفات العملاء، عقودهم، وشروط وأحكام التعاقد.",
    descEn: "Manage customer profiles, active agreements, and contract terms.",
    modules: [
      {
        section: "fleet",
        subPage: "customers",
        icon: "users-round",
        titleAr: "سجل العملاء",
        titleEn: "Customers",
        descAr: "دليل العملاء وبيانات الهوية ورخص القيادة وسجل التعاملات.",
        descEn: "Renter directory, national IDs, driver licenses, and history.",
      },
      {
        section: "fleet",
        subPage: "rental-contracts",
        icon: "file-text",
        titleAr: "عقود العملاء",
        titleEn: "Rental Contracts",
        descAr: "متابعة عقود التأجير المرتبطة بالعملاء والطباعة والتسليم.",
        descEn: "Track customer rental contracts, printing, and handovers.",
      },
      {
        section: "settings",
        subPage: "contract-terms",
        icon: "shield-check",
        titleAr: "شروط وأحكام العقود",
        titleEn: "Contract Terms & Conditions",
        descAr: "إدارة بنود وشروط العقد بالعربية والإنجليزية.",
        descEn: "Manage bilingual contract clauses and terms.",
      },
    ],
  },
  {
    id: "operations",
    icon: "wrench",
    titleAr: "Operations",
    titleEn: "Operations",
    subtitleAr: "التشغيل، السائقين، حركة السيارات",
    subtitleEn: "Fleet readiness, drivers & movements",
    descAr: "متابعة جاهزية الأسطول، السائقين، حركة السيارات بين الفروع، والصيانة.",
    descEn: "Monitor fleet readiness, drivers, inter-branch movements, and maintenance.",
    modules: [
      {
        section: "fleet",
        subPage: "movements",
        icon: "arrow-right",
        titleAr: "حركة ونقل السيارات",
        titleEn: "Vehicle Movement",
        descAr: "إرسال واستلام تحركات السيارات بين الفروع.",
        descEn: "Dispatch and receive vehicle movements across branches.",
      },
      {
        section: "fleet",
        subPage: "drivers",
        icon: "users-round",
        titleAr: "السائقون وتخصيص السائق",
        titleEn: "Driver Assignment",
        descAr: "سجل السائقين ورخص القيادة وتخصيصهم لتحركات الأسطول.",
        descEn: "Fleet drivers directory, licenses, and movement assignment.",
      },
      {
        section: "fleet",
        subPage: "rental-calendar",
        icon: "calendar",
        titleAr: "تقويم التشغيل والحجوزات",
        titleEn: "Rental Calendar",
        descAr: "عرض جدول تشغيل وحجوزات كل سيارة بالمدة والتواريخ.",
        descEn: "Monthly booking and operational timeline per vehicle.",
      },
      {
        section: "operations",
        subPage: "readiness",
        icon: "wrench",
        titleAr: "الجاهزية والصيانة والتأمين",
        titleEn: "Readiness & Maintenance",
        descAr: "متابعة الصيانة الدورية وسريان التأمين وجاهزية التشغيل.",
        descEn: "Track scheduled maintenance, insurance validity, and readiness.",
        isUpcoming: true,
      },
      {
        section: "operations",
        subPage: "incidents",
        icon: "shield",
        titleAr: "الحوادث والمرفقات",
        titleEn: "Accidents & Evidence",
        descAr: "تسجيل الحوادث وصور الأدلة ومتابعة الإصلاح.",
        descEn: "Record rental accidents, evidence photos, and repairs.",
        isUpcoming: true,
      },
    ],
  },
  {
    id: "finance",
    icon: "wallet",
    titleAr: "Finance",
    titleEn: "Finance",
    subtitleAr: "المشتريات، الأسعار، الموردين والتأمين",
    subtitleEn: "POs, pricing, vendors & approvals",
    descAr: "إدارة أوامر الشراء، قوائم الأسعار، الموردين، شركات التأمين، والاعتمادات المالية.",
    descEn: "Manage purchase orders, price lists, vendors, insurance, and approvals.",
    modules: [
      {
        section: "fleet",
        subPage: "purchase-orders",
        icon: "shopping-bag",
        titleAr: "أوامر شراء السيارات (PO)",
        titleEn: "Purchase Orders (PO)",
        descAr: "أوامر الشراء والدفعات واستلام السيارات.",
        descEn: "Purchase orders, payments, and vehicle receiving.",
      },
      {
        section: "fleet",
        subPage: "price-list",
        icon: "wallet",
        titleAr: "قائمة الأسعار",
        titleEn: "Price List",
        descAr: "إدارة قوائم الأسعار الفورية والمطارات والتأجير.",
        descEn: "Manage spot, airport, and leasing price lists and rates.",
      },
      {
        section: "fleet",
        subPage: "vendors",
        icon: "building-2",
        titleAr: "دليل الموردين",
        titleEn: "Vendors Directory",
        descAr: "دليل موردي السيارات وبيانات التواصل.",
        descEn: "Company suppliers and contacts.",
      },
      {
        section: "fleet",
        subPage: "insurance-companies",
        icon: "shield-check",
        titleAr: "شركات التأمين",
        titleEn: "Insurance Companies",
        descAr: "دليل شركات التأمين وبوالص السيارات.",
        descEn: "Insurance providers and policies.",
      },
      {
        section: "finance",
        subPage: "approvals",
        icon: "check-circle-2",
        titleAr: "اعتمادات المدير المالي",
        titleEn: "Finance Manager Approvals",
        descAr: "مراجعة واعتماد أو رفض أوامر الشراء والتسويات المالية.",
        descEn: "Approve or reject PO commitments and payouts.",
        isUpcoming: true,
      },
      {
        section: "finance",
        subPage: "branch-balances",
        icon: "trending-up",
        titleAr: "أرصدة الفروع والسيارات",
        titleEn: "Branch & Vehicle Balances",
        descAr: "تقارير الإيرادات والمصروفات لكل فرع بعملته.",
        descEn: "Income and expenses reported in each branch currency.",
        isUpcoming: true,
      },
    ],
  },
  {
    id: "asset",
    icon: "car-front",
    titleAr: "Asset",
    titleEn: "Asset",
    subtitleAr: "أصول السيارات والفئات والموديلات",
    subtitleEn: "Vehicles, variants, models & photos",
    descAr: "إدارة أصول الأسطول بالكامل من سيارات وفئات وموديلات وألوان ومكتبة الصور.",
    descEn: "Manage all fleet assets, vehicle registration, variants, models, and photos.",
    modules: [
      {
        section: "fleet",
        subPage: "vehicles",
        icon: "car-front",
        titleAr: "أصول السيارات",
        titleEn: "Vehicle Assets",
        descAr: "استعراض كافة سيارات الأسطول وحالتها وملفاتها.",
        descEn: "Browse all fleet vehicles, status, and profiles.",
      },
      {
        section: "fleet",
        subPage: "add-vehicle",
        icon: "plus",
        titleAr: "إضافة سيارة",
        titleEn: "Add Vehicle",
        descAr: "تسجيل وإضافة سيارة جديدة إلى الأصول.",
        descEn: "Register a new vehicle into fleet assets.",
      },
      {
        section: "fleet",
        subPage: "variants",
        icon: "layers",
        titleAr: "فئات السيارات",
        titleEn: "Model Variant Master",
        descAr: "تعريف قوالب الفئات والمواصفات الأساسية.",
        descEn: "Model specifications and variant templates.",
      },
      {
        section: "fleet",
        subPage: "models",
        icon: "car-front",
        titleAr: "الموديلات",
        titleEn: "Model",
        descAr: "تعريف الشركات المصنعة وموديلات السيارات.",
        descEn: "Vehicle manufacturers and models catalog.",
      },
      {
        section: "fleet",
        subPage: "body-styles",
        icon: "layers",
        titleAr: "هيكل السيارة",
        titleEn: "Body Style",
        descAr: "تعريف أنواع هياكل وفئات السيارات.",
        descEn: "Manage vehicle body styles and category codes.",
      },
      {
        section: "fleet",
        subPage: "colors",
        icon: "sparkles",
        titleAr: "الألوان",
        titleEn: "Colors",
        descAr: "تعريف الألوان الخارجية والداخلية للسيارات.",
        descEn: "Exterior and interior vehicle colors catalog.",
      },
      {
        section: "fleet",
        subPage: "vehicle-photos",
        icon: "eye",
        titleAr: "مكتبة وصور السيارات",
        titleEn: "Vehicle Photos Catalog",
        descAr: "رفع وإدارة مكتبة صور السيارات.",
        descEn: "Upload and manage verified vehicle photography.",
      },
    ],
  },
  {
    id: "sales",
    icon: "trending-up",
    titleAr: "Sales",
    titleEn: "Sales",
    subtitleAr: "عقود التأجير والحجوزات والتسعير",
    subtitleEn: "Rental contracts, bookings & rates",
    descAr: "إدارة المبيعات وعقود التأجير وتقويم الحجوزات وقوائم الأسعار والمزايا.",
    descEn: "Manage rental contracts, booking calendar, pricing, and rental inclusions.",
    modules: [
      {
        section: "fleet",
        subPage: "rental-contracts",
        icon: "file-text",
        titleAr: "عقود التأجير",
        titleEn: "Rental Contracts",
        descAr: "إنشاء وإدارة عقود التأجير واستلام السيارات.",
        descEn: "Create, track, and close vehicle rental contracts.",
      },
      {
        section: "fleet",
        subPage: "rental-calendar",
        icon: "calendar",
        titleAr: "تقويم الحجوزات",
        titleEn: "Rental Calendar",
        descAr: "عرض جدول حجوزات كل سيارة بالمدة والتواريخ.",
        descEn: "Monthly booking timeline per vehicle.",
      },
      {
        section: "fleet",
        subPage: "price-list",
        icon: "wallet",
        titleAr: "قائمة الأسعار",
        titleEn: "Price List",
        descAr: "عرض وإدارة أسعار التأجير اليومية والشرائح.",
        descEn: "Manage spot, airport, and leasing price lists.",
      },
      {
        section: "fleet",
        subPage: "rental-inclusions",
        icon: "check-circle-2",
        titleAr: "المزايا المشمولة",
        titleEn: "What's Included",
        descAr: "إدارة المزايا والتغطيات المشمولة في باقات الإيجار.",
        descEn: "Manage what's included in rental packages.",
      },
      {
        section: "fleet",
        subPage: "customers",
        icon: "users-round",
        titleAr: "العملاء",
        titleEn: "Customers",
        descAr: "الوصول السريع لسجل العملاء أثناء البيع والتأجير.",
        descEn: "Quick access to customer profiles during rentals.",
      },
    ],
  },
];

export function isDepartmentId(id: string): id is DepartmentId {
  return WORKSPACE_DEPARTMENTS.some((dept) => dept.id === id);
}

export function findDepartmentById(id: string): DepartmentDefinition | undefined {
  return WORKSPACE_DEPARTMENTS.find((dept) => dept.id === id);
}
