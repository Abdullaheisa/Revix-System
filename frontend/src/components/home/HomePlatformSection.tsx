import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import type { HomePlatformCopy } from "@/components/home/types";

export interface HomePlatformSectionProps {
  platform: HomePlatformCopy;
}

export function HomePlatformSection({ platform }: HomePlatformSectionProps) {
  const pillars: { title: string; desc: string; icon: RevixIconName }[] = [
    {
      title: platform.pillars.p1Title,
      desc: platform.pillars.p1Desc,
      icon: "file-text",
    },
    {
      title: platform.pillars.p2Title,
      desc: platform.pillars.p2Desc,
      icon: "car-front",
    },
    {
      title: platform.pillars.p3Title,
      desc: platform.pillars.p3Desc,
      icon: "layout-dashboard",
    },
  ];

  return (
    <section
      id="platform"
      className="border-t border-revix-border/75 bg-revix-white py-9 sm:py-11 lg:py-12 scroll-mt-24"
    >
      <ResponsiveContainer>
        <ScrollReveal
          direction="up"
          distance={38}
          duration={820}
          className="max-w-[720px]"
        >
          <h2 className="revix-heading-h2 text-[clamp(1.65rem,3vw,2.45rem)] leading-[1.15] text-revix-dark">
            <span className="block">{platform.headlineLineOne}</span>
            <span className="block text-revix-primary">
              {platform.headlineLineTwo}
            </span>
          </h2>

          <p className="revix-body-lg mt-3.5 max-w-[640px] text-revix-secondary">
            {platform.description}
          </p>
        </ScrollReveal>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {pillars.map((pillar, index) => (
            <ScrollReveal
              key={pillar.title}
              direction="up"
              delay={index * 150}
              distance={44}
              duration={820}
              className="h-full"
            >
              <div className="h-full rounded-card border border-revix-border bg-revix-white p-6 shadow-2xs transition-[transform,box-shadow] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-award bg-revix-tint text-revix-primary"
                >
                  <RevixIcon name={pillar.icon} size={22} />
                </div>
                <h3 className="mt-4 text-[18px] font-bold tracking-[-0.015em] text-revix-dark">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-revix-secondary">
                  {pillar.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
