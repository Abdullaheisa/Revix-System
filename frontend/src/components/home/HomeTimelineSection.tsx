import type { CSSProperties } from "react";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { RevixWordmark } from "@/components/home/HomeNavbar";
import type { HomeTimelineCopy } from "@/components/home/types";

export interface HomeTimelineSectionProps {
  brandName: string;
  brandDescriptor: string;
  timeline: HomeTimelineCopy;
}

interface TimelineTrackRow {
  model: string;
  plate: string;
  bars: {
    label: string;
    gridClass: string;
    toneClass: string;
  }[];
}

export function HomeTimelineSection({
  brandName,
  brandDescriptor,
  timeline,
}: HomeTimelineSectionProps) {
  const steps = [
    timeline.steps.s1,
    timeline.steps.s2,
    timeline.steps.s3,
    timeline.steps.s4,
  ];

  const board = timeline.board;

  const sidebarItems: {
    label: string;
    icon: RevixIconName;
    active?: boolean;
  }[] = [
    { label: board.sidebar.overview, icon: "layout-dashboard" },
    { label: board.sidebar.sales, icon: "file-text" },
    { label: board.sidebar.operations, icon: "car-front" },
    { label: board.sidebar.timeline, icon: "zap", active: true },
    { label: board.sidebar.finance, icon: "building-2" },
    { label: board.sidebar.settings, icon: "shield-check" },
  ];

  const days = [
    { key: "mon", label: board.days.mon, active: false },
    { key: "tue", label: board.days.tue, active: false },
    { key: "wed", label: board.days.wed, active: false },
    { key: "thu", label: board.days.thu, active: true },
    { key: "fri", label: board.days.fri, active: false },
    { key: "sat", label: board.days.sat, active: false },
    { key: "sun", label: board.days.sun, active: false },
  ];

  const groups: { title: string; rows: TimelineTrackRow[] }[] = [
    {
      title: board.groups.compact,
      rows: [
        {
          model: board.vehicles.g1r1Model,
          plate: board.vehicles.g1r1Plate,
          bars: [
            {
              label: board.vehicles.g1r1Bar,
              gridClass: "col-start-5 col-span-7",
              toneClass: "bg-revix-primary text-revix-white",
            },
          ],
        },
        {
          model: board.vehicles.g1r2Model,
          plate: board.vehicles.g1r2Plate,
          bars: [
            {
              label: board.vehicles.g1r2BarOne,
              gridClass: "col-start-1 col-span-6",
              toneClass:
                "bg-revix-tint text-revix-primary border border-revix-primary/25",
            },
            {
              label: board.vehicles.g1r2BarTwo,
              gridClass: "col-start-9 col-span-5",
              toneClass: "bg-revix-dark text-revix-white",
            },
          ],
        },
        {
          model: board.vehicles.g1r3Model,
          plate: board.vehicles.g1r3Plate,
          bars: [
            {
              label: board.vehicles.g1r3Bar,
              gridClass: "col-start-3 col-span-8",
              toneClass: "bg-revix-primary text-revix-white",
            },
          ],
        },
      ],
    },
    {
      title: board.groups.suv,
      rows: [
        {
          model: board.vehicles.g2r1Model,
          plate: board.vehicles.g2r1Plate,
          bars: [
            {
              label: board.vehicles.g2r1BarOne,
              gridClass: "col-start-1 col-span-5",
              toneClass: "bg-revix-dark text-revix-white",
            },
            {
              label: board.vehicles.g2r1BarTwo,
              gridClass: "col-start-7 col-span-4",
              toneClass:
                "revix-stripe-bar border border-revix-border text-revix-secondary",
            },
          ],
        },
        {
          model: board.vehicles.g2r2Model,
          plate: board.vehicles.g2r2Plate,
          bars: [
            {
              label: board.vehicles.g2r2Bar,
              gridClass: "col-start-2 col-span-11",
              toneClass:
                "bg-revix-tint text-revix-primary border border-revix-primary/25",
            },
          ],
        },
      ],
    },
  ];

  return (
    <section
      id="workflow"
      className="border-t border-revix-border/75 bg-revix-surface/65 py-9 sm:py-11 lg:py-12 scroll-mt-24"
    >
      <ResponsiveContainer>
        {/* Heading & Intro */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end lg:gap-10">
          <ScrollReveal
            direction="start"
            distance={44}
            duration={840}
            className="lg:col-span-7"
          >
            <p className="text-[12.5px] font-semibold tracking-wide text-revix-primary">
              {timeline.eyebrow}
            </p>
            <h2 className="revix-heading-h2 mt-2 text-[clamp(1.65rem,3vw,2.4rem)] leading-[1.15] text-revix-dark">
              {timeline.headline}
            </h2>
          </ScrollReveal>
          <ScrollReveal
            direction="end"
            delay={120}
            distance={44}
            duration={840}
            className="lg:col-span-5"
          >
            <p className="revix-body-md text-revix-secondary">
              {timeline.description}
            </p>
          </ScrollReveal>
        </div>

        {/* 4-Step Rental Journey Strip */}
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step}>
              <ScrollReveal
                direction="up"
                delay={index * 110}
                distance={32}
                duration={760}
              >
                <div className="rounded-award border border-revix-border bg-revix-white px-4 py-3 text-[13.5px] font-semibold text-revix-dark shadow-2xs transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none">
                  {step}
                </div>
              </ScrollReveal>
            </li>
          ))}
        </ol>

        {/* Dotted Showcase Stage framing the Timeline Board */}
        <ScrollReveal
          direction="up"
          delay={160}
          distance={48}
          duration={920}
          className="revix-dotted-stage mt-6 rounded-[24px] border border-revix-primary/12 p-3 sm:rounded-[28px] sm:p-5 lg:p-6"
        >
          <div className="overflow-hidden rounded-[18px] border border-revix-border bg-revix-white shadow-[0_20px_50px_-16px_rgba(12,57,32,0.14)] sm:rounded-[20px]">
            <div className="flex flex-col lg:flex-row">
              {/* Deep Forest Brand Sidebar */}
              <div
                aria-hidden="true"
                className="hidden lg:flex lg:w-[196px] shrink-0 flex-col bg-[#0C3920] p-4 text-revix-white"
              >
                <div className="flex items-center px-2 pb-5 pt-1">
                  <RevixWordmark
                    alt={brandName}
                    descriptor={brandDescriptor}
                    inverted
                    className="h-[19px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  {sidebarItems.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] ${
                        item.active
                          ? "bg-revix-primary font-semibold text-revix-white shadow-xs"
                          : "font-medium text-white/75"
                      }`}
                    >
                      <RevixIcon name={item.icon} size={15} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Workspace */}
              <div className="flex-1 min-w-0 bg-revix-white p-4 sm:p-6">
                {/* Header & Vehicle Status Legend */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-[19px] font-bold tracking-[-0.02em] text-revix-dark">
                        {board.title}
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-revix-primary/20 bg-revix-tint px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary">
                        {board.sampleBadge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-revix-secondary">
                      {board.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-revix-dark">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-[3px] border border-revix-primary/35 bg-revix-tint"
                      />
                      <span>{board.legendAvailable}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-[3px] bg-revix-dark"
                      />
                      <span>{board.legendReserved}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-[3px] bg-revix-primary"
                      />
                      <span>{board.legendOnRent}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="revix-stripe-bar h-2.5 w-2.5 rounded-[3px] border border-revix-border"
                      />
                      <span>{board.legendMaintenance}</span>
                    </span>
                  </div>
                </div>

                {/* Unassigned Booking Lane (explicitly a booking status, not a vehicle status) */}
                <div className="mt-4 flex items-center gap-2.5 rounded-control border border-dashed border-amber-600/45 bg-amber-50/75 px-3.5 py-2 text-[12.5px] font-medium text-amber-950">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full bg-amber-600"
                  />
                  <span>{board.bookingQueueStatus}</span>
                </div>

                {/* Horizontally Scrollable 7-Day Schedule Grid (contained on mobile) */}
                <div className="mt-4 overflow-x-auto rounded-award border border-revix-border">
                  <div className="min-w-[740px]">
                    {/* Column Header Row */}
                    <div className="grid grid-cols-[175px_repeat(7,minmax(0,1fr))] border-b border-revix-border bg-revix-surface/70 text-[12px]">
                      <div className="px-3.5 py-2.5 font-semibold text-revix-secondary border-e border-revix-border">
                        {board.vehicleColLabel}
                      </div>
                      {days.map((day) => (
                        <div
                          key={day.key}
                          className={`px-2 py-2.5 text-center border-e last:border-e-0 border-revix-border ${
                            day.active
                              ? "bg-revix-tint font-bold text-revix-primary"
                              : "font-medium text-revix-secondary"
                          }`}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>

                    {/* Fleet Category Groups */}
                    {groups.map((group) => (
                      <div key={group.title}>
                        <div className="border-b border-revix-border bg-revix-surface px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-revix-secondary">
                          {group.title}
                        </div>

                        <div className="divide-y divide-revix-border/80">
                          {group.rows.map((row, rowIndex) => (
                            <div
                              key={row.plate}
                              className="grid grid-cols-[175px_1fr] items-stretch"
                            >
                              <div className="border-e border-revix-border bg-revix-white px-3.5 py-3 text-start">
                                <p className="truncate text-[13px] font-semibold text-revix-dark">
                                  {row.model}
                                </p>
                                <p className="mt-0.5 text-[11.5px] font-medium text-revix-secondary tabular-nums">
                                  {row.plate}
                                </p>
                              </div>

                              <div className="relative flex items-center bg-revix-white">
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0 grid grid-cols-7"
                                >
                                  {days.map((day) => (
                                    <div
                                      key={day.key}
                                      className={`border-e last:border-e-0 border-revix-border/65 ${
                                        day.active ? "bg-revix-tint/45" : ""
                                      }`}
                                    />
                                  ))}
                                </div>

                                <div className="relative z-10 grid w-full grid-cols-14 items-center gap-1 px-1.5 py-2.5">
                                  {row.bars.map((bar, barIndex) => (
                                    <div
                                      key={`${row.plate}-${bar.label}`}
                                      style={
                                        {
                                          "--bar-delay": `${280 + rowIndex * 110 + barIndex * 90}ms`,
                                        } as CSSProperties
                                      }
                                      className={`revix-timeline-bar ${bar.gridClass} ${bar.toneClass} flex min-h-[30px] items-center truncate rounded-control px-2.5 text-[11.5px] font-semibold shadow-2xs`}
                                    >
                                      <span className="truncate">{bar.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </ResponsiveContainer>
    </section>
  );
}
