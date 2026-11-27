"use client";

import type { AuthUserDto } from "@/store/api/authApi";
import type {
  BranchDto,
  CompanyDto,
  WorkspaceMembershipDto,
} from "@/store/api/workspaceApi";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";
import { canAccessWorkspacePage } from "@/lib/workspace/navigationCatalog";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";

export interface WorkspaceWelcomePanelProps {
  isRtl: boolean;
  company: CompanyDto;
  activeBranch: BranchDto | null;
  user: AuthUserDto;
  membership: WorkspaceMembershipDto | null;
  onNavigate: (section: WorkspaceSectionId, subPage: string) => void;
}

interface CorePageLink {
  section: WorkspaceSectionId;
  subPage: string;
  icon: RevixIconName;
  titleAr: string;
  titleEn: string;
}

const CORE_PAGES: CorePageLink[] = [
  {
    section: "fleet",
    subPage: "vehicles",
    icon: "car-front",
    titleAr: "السيارات والأسطول",
    titleEn: "Fleet Vehicles",
  },
  {
    section: "fleet",
    subPage: "rental-contracts",
    icon: "file-text",
    titleAr: "عقود التأجير",
    titleEn: "Rental Contracts",
  },
  {
    section: "fleet",
    subPage: "rental-calendar",
    icon: "calendar",
    titleAr: "تقويم الحجوزات",
    titleEn: "Rental Calendar",
  },
  {
    section: "fleet",
    subPage: "customers",
    icon: "users-round",
    titleAr: "العملاء",
    titleEn: "Customers",
  },
  {
    section: "fleet",
    subPage: "price-list",
    icon: "wallet",
    titleAr: "قائمة الأسعار",
    titleEn: "Price List",
  },
  {
    section: "settings",
    subPage: "company-profile",
    icon: "building-2",
    titleAr: "إعدادات الشركة",
    titleEn: "Company Settings",
  },
];

export function WorkspaceWelcomePanel({
  isRtl,
  company,
  activeBranch,
  user,
  membership,
  onNavigate,
}: WorkspaceWelcomePanelProps) {
  const visiblePages = CORE_PAGES.filter((item) =>
    canAccessWorkspacePage(item.section, item.subPage, company?.operatingMode, membership),
  );
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Simple Background-Image Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-revix-border bg-[#0d281c] px-6 py-12 text-white shadow-sm sm:px-10 sm:py-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/welcome-hero-car.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#091f15]/90 via-[#0d281c]/65 to-[#0d281c]/55" />

        <div className="relative z-10 max-w-xl space-y-2">
          <p className="text-xs font-medium tracking-wide text-emerald-200/90">
            {company.name}
            {activeBranch ? ` · ${activeBranch.name}` : ""}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isRtl
              ? `مرحباً بك في Revix، ${user.fullName}`
              : `Welcome to Revix, ${user.fullName}`}
          </h1>
          <p className="text-xs text-white/80 sm:text-sm">
            {isRtl
              ? "اختر الصفحة التي تريد البدء منها لإدارة الأسطول والعقود."
              : "Choose a section below to manage your fleet and rentals."}
          </p>
        </div>
      </section>

      {/* Clean Essential Pages Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePages.map((item) => (
          <button
            key={`${item.section}:${item.subPage}`}
            type="button"
            onClick={() => onNavigate(item.section, item.subPage)}
            className="group flex cursor-pointer items-center justify-between rounded-xl border border-revix-border bg-white px-4 py-4 text-start transition-colors hover:border-[#14532D]/40 hover:bg-emerald-50/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#14532D] transition-colors group-hover:bg-[#14532D] group-hover:text-white">
                <RevixIcon name={item.icon} size={18} />
              </div>
              <span className="text-sm font-semibold text-revix-dark group-hover:text-[#14532D]">
                {isRtl ? item.titleAr : item.titleEn}
              </span>
            </div>
            <RevixIcon
              name={isRtl ? "arrow-left" : "arrow-right"}
              size={15}
              className="text-revix-muted transition-colors group-hover:text-[#14532D]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
