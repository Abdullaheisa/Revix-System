import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { RevixSurfaceBackdrop } from "@/components/home/RevixSurfaceBackdrop";
import type { HomeHeroCopy, HomeHeroPreviewCopy } from "@/components/home/types";

export interface HomeHeroSectionProps {
  isRtl: boolean;
  hero: HomeHeroCopy;
  preview: HomeHeroPreviewCopy;
}

export function HomeHeroSection({
  isRtl,
  hero,
  preview,
}: HomeHeroSectionProps) {
  const supportingLabels = [hero.labels.l1, hero.labels.l2, hero.labels.l3];

  return (
    <section
      id="top"
      className="relative overflow-x-clip bg-revix-white pb-6 pt-1 sm:pb-8 lg:pb-10"
    >
      <div className="relative mx-2 mt-[-66px] pt-[84px] pb-7 sm:mx-4 sm:mt-[-70px] sm:pt-[94px] sm:pb-9 lg:mx-6 lg:pt-[100px] lg:pb-10">
        {/* Restrained mint-sage backdrop framing the split hero */}
        <div
          aria-hidden="true"
          className="revix-hero-surface pointer-events-none absolute inset-0 overflow-hidden rounded-[24px] border border-revix-primary/12 sm:rounded-[32px]"
        >
          <RevixSurfaceBackdrop variant="hero" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/55 via-white/15 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Start Column: Headline, Description, CTAs & Supporting Labels */}
            <div className="lg:col-span-5 text-start">
              <h1 className="revix-display-h1 revix-anim-headline text-[clamp(1.85rem,3.2vw,2.8rem)] leading-[1.13] tracking-[-0.025em] text-revix-dark">
                <span className="block">{hero.headlineLineOne}</span>
                <span className="mt-1 block text-revix-primary">
                  {hero.headlineLineTwo}
                </span>
              </h1>

              <p className="revix-anim-description mt-4 max-w-[520px] text-[15px] leading-[1.65] text-revix-secondary sm:text-[16px]">
                {hero.description}
              </p>

              <div className="revix-anim-actions mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-revix-primary bg-revix-primary px-6 py-2.5 text-[14px] font-semibold text-revix-white shadow-xs transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:bg-revix-primary-hover hover:border-revix-primary-hover hover:shadow-md hover:shadow-revix-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary motion-reduce:transform-none"
                >
                  <span>{hero.primaryCta}</span>
                  <RevixIcon
                    name={isRtl ? "arrow-left" : "arrow-right"}
                    size={17}
                    className="transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                  />
                </Link>

                <a
                  href="#workflow"
                  className="inline-flex min-h-[42px] items-center justify-center sm:justify-start gap-1.5 rounded-full px-3 text-[14.5px] font-semibold text-revix-dark underline decoration-revix-primary/45 decoration-2 underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-revix-primary hover:decoration-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
                >
                  <span>{hero.secondaryCta}</span>
                </a>
              </div>

              <ul className="revix-anim-description mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-medium text-revix-secondary">
                {supportingLabels.map((label) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-revix-white/90 text-revix-primary ring-1 ring-revix-primary/20"
                    >
                      <RevixIcon name="check" size={11} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* End Column: Revix System Product Preview */}
            <div className="lg:col-span-7">
              <HeroWorkspaceShowcase preview={preview} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroWorkspaceShowcase({ preview }: { preview: HomeHeroPreviewCopy }) {
  const sidebarItems: { label: string; icon: RevixIconName; active?: boolean }[] = [
    { label: preview.sidebar.overview, icon: "layout-dashboard", active: true },
    { label: preview.sidebar.sales, icon: "file-text" },
    { label: preview.sidebar.operations, icon: "car-front" },
    { label: preview.sidebar.finance, icon: "building-2" },
    { label: preview.sidebar.settings, icon: "shield-check" },
  ];

  const kpiCards = [
    {
      label: preview.kpis.totalLabel,
      value: preview.kpis.totalValue,
      accentClass: "text-revix-dark",
    },
    {
      label: preview.kpis.availableLabel,
      value: preview.kpis.availableValue,
      accentClass: "text-revix-primary",
    },
    {
      label: preview.kpis.activeLabel,
      value: preview.kpis.activeValue,
      accentClass: "text-revix-dark",
    },
    {
      label: preview.kpis.returnsLabel,
      value: preview.kpis.returnsValue,
      accentClass: "text-revix-primary",
    },
  ];

  const activityRows = [
    {
      vehicle: preview.rows.r1Vehicle,
      meta: preview.rows.r1Meta,
      amount: preview.rows.r1Amount,
      status: preview.rows.r1Status,
      badgeClass: "bg-revix-primary text-revix-white border-revix-primary",
    },
    {
      vehicle: preview.rows.r2Vehicle,
      meta: preview.rows.r2Meta,
      amount: preview.rows.r2Amount,
      status: preview.rows.r2Status,
      badgeClass: "bg-revix-dark text-revix-white border-revix-dark",
    },
    {
      vehicle: preview.rows.r3Vehicle,
      meta: preview.rows.r3Meta,
      amount: preview.rows.r3Amount,
      status: preview.rows.r3Status,
      badgeClass: "bg-revix-tint text-revix-primary border-revix-primary/25",
    },
  ];

  const branchSummaries = [
    {
      name: preview.branchSummaryItems.b1Name,
      meta: preview.branchSummaryItems.b1Meta,
      value: preview.branchSummaryItems.b1Value,
    },
    {
      name: preview.branchSummaryItems.b2Name,
      meta: preview.branchSummaryItems.b2Meta,
      value: preview.branchSummaryItems.b2Value,
    },
  ];

  return (
    <div
      role="region"
      aria-label={preview.regionLabel}
      className="relative w-full"
    >
      <div className="revix-anim-frame relative overflow-hidden rounded-[18px] border border-revix-border/90 bg-revix-white shadow-[0_24px_56px_-16px_rgba(12,57,32,0.16),0_8px_22px_-6px_rgba(17,24,39,0.07)] sm:rounded-[22px]">
        {/* Top Window Chrome */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-revix-border/80 bg-revix-surface/85 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-revix-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-revix-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-revix-border" />
            </div>
            <span className="truncate text-[12px] font-medium text-revix-secondary">
              {preview.workspacePath}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-revix-primary/20 bg-revix-tint px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary whitespace-nowrap">
            <RevixIcon name="info" size={12} />
            <span>{preview.sampleBadge}</span>
          </span>
        </div>

        {/* Workspace Layout */}
        <div className="flex flex-col sm:flex-row">
          {/* Compact Sidebar on xl+ so the split frame stays spacious */}
          <div
            aria-hidden="true"
            className="hidden xl:flex xl:w-[152px] shrink-0 flex-col gap-1 border-e border-revix-border/75 bg-revix-surface/50 p-3"
          >
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-control px-2.5 py-1.5 text-[12px] ${
                  item.active
                    ? "bg-revix-tint font-semibold text-revix-primary"
                    : "font-medium text-revix-secondary"
                }`}
              >
                <RevixIcon name={item.icon} size={14} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main Preview Canvas */}
          <div className="flex-1 min-w-0 space-y-3 p-3.5 sm:space-y-3.5 sm:p-4">
            {/* Company & Branch Filter Context (illustrative static indicators) */}
            <div
              aria-hidden="true"
              className="flex flex-wrap items-center gap-2 rounded-award border border-revix-border/80 bg-revix-surface/65 px-2.5 py-2 text-[11.5px]"
            >
              <span className="inline-flex items-center gap-1.5 rounded-control border border-revix-border bg-revix-white px-2 py-1 text-revix-dark">
                <RevixIcon name="building-2" size={12} className="text-revix-primary" />
                <span className="text-revix-secondary">{preview.companyLabel}:</span>
                <span className="font-semibold">{preview.companyValue}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-control border border-revix-border bg-revix-white px-2 py-1 text-revix-dark">
                <RevixIcon name="globe-2" size={12} className="text-revix-primary" />
                <span className="text-revix-secondary">{preview.branchLabel}:</span>
                <span className="font-semibold">{preview.branchValue}</span>
              </span>
            </div>

            {/* 4 Consistent Fleet KPIs */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
              {kpiCards.map((item, index) => (
                <div
                  key={item.label}
                  style={{ "--stagger-delay": `${320 + index * 90}ms` } as CSSProperties}
                  className="revix-anim-stagger rounded-award border border-revix-border/80 bg-revix-white px-3 py-2 text-start"
                >
                  <p className="truncate text-[11px] font-medium text-revix-secondary">
                    {item.label}
                  </p>
                  <p
                    className={`mt-0.5 text-[18px] font-bold tracking-[-0.02em] tabular-nums sm:text-[20px] ${item.accentClass}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Activity Rows */}
            <div className="overflow-hidden rounded-award border border-revix-border/80 bg-revix-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-revix-border/75 bg-revix-surface/55 px-3 py-2">
                <span className="text-[12px] font-semibold text-revix-dark">
                  {preview.activityHeading}
                </span>
                <span className="text-[11px] font-medium text-revix-secondary">
                  {preview.activitySubheading}
                </span>
              </div>

              <div className="divide-y divide-revix-border/70">
                {activityRows.map((row, index) => (
                  <div
                    key={row.vehicle}
                    style={{ "--stagger-delay": `${520 + index * 100}ms` } as CSSProperties}
                    className="revix-anim-stagger flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-control bg-revix-tint text-revix-primary"
                      >
                        <RevixIcon name="car-front" size={13} />
                      </span>
                      <div className="min-w-0 text-start">
                        <p className="truncate text-[12px] font-semibold text-revix-dark">
                          {row.vehicle}
                        </p>
                        <p className="truncate text-[11px] text-revix-secondary">
                          {row.meta}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11.5px] font-semibold text-revix-dark tabular-nums">
                        {row.amount}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${row.badgeClass}`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Separate Branch Currencies Summary */}
            <div className="revix-anim-card-3 rounded-award border border-revix-border/80 bg-revix-surface/45 p-3 text-start">
              <p className="text-[11.5px] font-semibold text-revix-dark">
                {preview.branchSummaryTitle}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {branchSummaries.map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between gap-2 rounded-control border border-revix-border/80 bg-revix-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-revix-dark">
                        {branch.name}
                      </p>
                      <p className="truncate text-[10.5px] text-revix-secondary">
                        {branch.meta}
                      </p>
                    </div>
                    <p className="shrink-0 text-[12px] font-bold text-revix-primary tabular-nums">
                      {branch.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
