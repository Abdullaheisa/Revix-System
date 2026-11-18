import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import type { HomeIntegrationsCopy } from "@/components/home/types";

export interface HomeIntegrationsSectionProps {
  integrations: HomeIntegrationsCopy;
}

export function HomeIntegrationsSection({
  integrations,
}: HomeIntegrationsSectionProps) {
  const cards: { title: string; desc: string; icon: RevixIconName }[] = [
    {
      title: integrations.cards.c1Title,
      desc: integrations.cards.c1Desc,
      icon: "globe-2",
    },
    {
      title: integrations.cards.c2Title,
      desc: integrations.cards.c2Desc,
      icon: "users-round",
    },
    {
      title: integrations.cards.c3Title,
      desc: integrations.cards.c3Desc,
      icon: "shield-check",
    },
  ];

  return (
    <section
      id="integrations"
      className="border-t border-revix-border/75 bg-revix-white py-9 sm:py-11 lg:py-12 scroll-mt-24"
    >
      <ResponsiveContainer>
        <ScrollReveal
          direction="up"
          distance={38}
          duration={820}
          className="max-w-[680px]"
        >
          <p className="text-[12.5px] font-semibold tracking-wide text-revix-primary">
            {integrations.eyebrow}
          </p>
          <h2 className="revix-heading-h2 mt-2 text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.16] text-revix-dark">
            {integrations.headline}
          </h2>
          <p className="revix-body-lg mt-3 text-revix-secondary">
            {integrations.description}
          </p>
        </ScrollReveal>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {cards.map((card, index) => (
            <ScrollReveal
              key={card.title}
              direction="up"
              delay={index * 150}
              distance={44}
              duration={820}
              className="h-full"
            >
              <div className="h-full rounded-card border border-revix-border bg-revix-surface/50 p-6 transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-award bg-revix-tint text-revix-primary"
                  >
                    <RevixIcon name={card.icon} size={20} />
                  </span>
                  <span className="inline-flex items-center rounded-full border border-revix-primary/20 bg-revix-white px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary">
                    {integrations.plannedBadge}
                  </span>
                </div>

                <h3 className="mt-4 text-[17.5px] font-bold text-revix-dark">
                  {card.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-revix-secondary">
                  {card.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Modest Notifications Future-Capabilities Note */}
        <ScrollReveal
          direction="up"
          delay={260}
          distance={30}
          duration={800}
          className="mt-4 flex flex-col gap-3 rounded-card border border-revix-border bg-revix-surface/75 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-revix-tint text-revix-primary"
            >
              <RevixIcon name="mail" size={16} />
            </span>
            <div>
              <p className="text-[14px] font-bold text-revix-dark">
                {integrations.notificationsTitle}
              </p>
              <p className="mt-0.5 text-[13.5px] leading-[1.55] text-revix-secondary">
                {integrations.notificationsNote}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-revix-primary/20 bg-revix-white px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary">
            {integrations.plannedBadge}
          </span>
        </ScrollReveal>
      </ResponsiveContainer>
    </section>
  );
}
