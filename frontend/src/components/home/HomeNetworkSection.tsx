import type { CSSProperties } from "react";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon } from "@/components/ui/RevixIcons";
import type { HomeNetworksCopy } from "@/components/home/types";

export interface HomeNetworkSectionProps {
  networks: HomeNetworksCopy;
}

export function HomeNetworkSection({ networks }: HomeNetworkSectionProps) {
  const independentBullets = [
    networks.independent.b1,
    networks.independent.b2,
    networks.independent.b3,
  ];
  const networkBullets = [
    networks.network.b1,
    networks.network.b2,
    networks.network.b3,
  ];

  const partners = [
    {
      name: networks.diagram.partnerOneName,
      detail: networks.diagram.partnerOneDetail,
    },
    {
      name: networks.diagram.partnerTwoName,
      detail: networks.diagram.partnerTwoDetail,
    },
  ];

  return (
    <section
      id="networks"
      className="border-t border-revix-primary/12 bg-revix-tint/55 py-9 sm:py-11 lg:py-12 scroll-mt-24"
    >
      <ResponsiveContainer>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* Narrative & Two Balanced Comparison Cards */}
          <ScrollReveal
            direction="start"
            distance={54}
            duration={880}
            className="lg:col-span-7 space-y-6"
          >
            <div>
              <p className="text-[12.5px] font-semibold tracking-wide text-revix-primary">
                {networks.eyebrow}
              </p>
              <h2 className="revix-heading-h2 mt-2 text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.16] text-revix-dark">
                {networks.headline}
              </h2>
              <p className="revix-body-lg mt-3 max-w-[600px] text-revix-secondary">
                {networks.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Independent Company Card */}
              <div className="rounded-card border border-revix-border bg-revix-white p-5 shadow-2xs transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-award bg-revix-tint text-revix-primary"
                  >
                    <RevixIcon name="building-2" size={18} />
                  </span>
                  <h3 className="text-[17px] font-bold text-revix-dark">
                    {networks.independent.title}
                  </h3>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {independentBullets.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[14px] text-revix-secondary"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-revix-primary"
                      >
                        <RevixIcon name="check" size={15} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Network Card */}
              <div className="rounded-card border border-revix-primary/25 bg-revix-white p-5 shadow-2xs transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-award bg-revix-primary text-revix-white"
                  >
                    <RevixIcon name="users-round" size={18} />
                  </span>
                  <h3 className="text-[17px] font-bold text-revix-dark">
                    {networks.network.title}
                  </h3>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {networkBullets.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[14px] text-revix-secondary"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-revix-primary"
                      >
                        <RevixIcon name="check" size={15} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[14px] font-medium leading-[1.6] text-revix-dark">
              {networks.supportingCopy}
            </p>
          </ScrollReveal>

          {/* Compact Workspace Separation Visual */}
          <ScrollReveal
            direction="end"
            delay={180}
            distance={54}
            duration={880}
            className="lg:col-span-5"
          >
            <div className="rounded-[22px] border border-revix-primary/18 bg-revix-white p-5 shadow-[0_18px_44px_-16px_rgba(12,57,32,0.12)] sm:p-6">
              {/* Main Company Node */}
              <div
                style={{ "--node-delay": "180ms" } as CSSProperties}
                className="revix-network-node rounded-award border border-revix-primary/25 bg-revix-primary px-4 py-3.5 text-revix-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                    {networks.diagram.mainLabel}
                  </span>
                  <RevixIcon name="building-2" size={16} className="text-white/85" />
                </div>
                <p className="mt-1 text-[15px] font-bold">
                  {networks.diagram.mainTitle}
                </p>
                <p className="mt-0.5 text-[12px] text-white/85">
                  {networks.diagram.mainScopeNote}
                </p>
              </div>

              {/* Permission Gate Connector */}
              <div
                style={{ "--node-delay": "340ms" } as CSSProperties}
                className="revix-network-node my-3.5 flex flex-col items-center"
              >
                <div aria-hidden="true" className="h-3.5 w-px bg-revix-primary/35" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-revix-primary/25 bg-revix-tint px-3 py-1 text-[11.5px] font-semibold text-revix-primary">
                  <RevixIcon name="shield-check" size={13} />
                  <span>{networks.diagram.permissionBadge}</span>
                </span>
                <div aria-hidden="true" className="h-3.5 w-px bg-revix-primary/35" />
              </div>

              {/* Separate Local Company Workspaces */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {partners.map((partner, index) => (
                  <div
                    key={partner.name}
                    style={
                      { "--node-delay": `${480 + index * 140}ms` } as CSSProperties
                    }
                    className="revix-network-node rounded-award border border-revix-border bg-revix-surface/75 p-3.5 text-start"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-revix-border bg-revix-white px-2 py-0.5 text-[10.5px] font-semibold text-revix-secondary">
                      <RevixIcon name="shield-check" size={11} className="text-revix-primary" />
                      <span>{networks.diagram.privateBadge}</span>
                    </span>
                    <p className="mt-2 text-[14px] font-bold text-revix-dark">
                      {partner.name}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.45] text-revix-secondary">
                      {partner.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
