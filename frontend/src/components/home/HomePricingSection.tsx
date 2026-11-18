import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon } from "@/components/ui/RevixIcons";
import type { HomePlansCopy } from "@/components/home/types";

export interface HomePricingSectionProps {
  plans: HomePlansCopy;
}

export function HomePricingSection({ plans }: HomePricingSectionProps) {
  const planCards = [
    {
      title: plans.cards.independentTitle,
      description: plans.cards.independentDesc,
      icon: "building-2" as const,
    },
    {
      title: plans.cards.networkTitle,
      description: plans.cards.networkDesc,
      icon: "users-round" as const,
    },
  ];

  return (
    <section
      id="plans"
      className="border-t border-revix-border/75 bg-revix-surface/65 py-9 sm:py-11 lg:py-12 scroll-mt-24"
    >
      <ResponsiveContainer>
        <ScrollReveal
          direction="up"
          distance={38}
          duration={820}
          className="max-w-[680px]"
        >
          <p className="text-[12.5px] font-semibold tracking-wide text-revix-primary">
            {plans.eyebrow}
          </p>
          <h2 className="revix-heading-h2 mt-2 text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.16] text-revix-dark">
            {plans.headline}
          </h2>
          <p className="revix-body-lg mt-3 text-revix-secondary">
            {plans.description}
          </p>
        </ScrollReveal>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {planCards.map((card, index) => (
            <ScrollReveal
              key={card.title}
              direction="up"
              delay={index * 160}
              distance={44}
              duration={840}
              className="h-full"
            >
              <div className="flex h-full flex-col justify-between rounded-card border border-revix-border bg-revix-white p-6 shadow-2xs transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-md sm:p-7 motion-reduce:transform-none">
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-award bg-revix-tint text-revix-primary"
                    >
                      <RevixIcon name={card.icon} size={20} />
                    </span>
                    <h3 className="text-[19px] font-bold text-revix-dark">
                      {card.title}
                    </h3>
                  </div>

                  <p className="mt-3.5 text-[15px] leading-[1.6] text-revix-secondary">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-revix-border/80 pt-4">
                  <p className="text-[15px] font-semibold text-revix-primary">
                    {plans.priceLabel}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal
          direction="up"
          delay={220}
          distance={24}
          duration={760}
          rootMargin="0px 0px -10px 0px"
        >
          <p className="mt-4 text-[13.5px] text-revix-secondary">
            {plans.footnote}
          </p>
        </ScrollReveal>
      </ResponsiveContainer>
    </section>
  );
}
