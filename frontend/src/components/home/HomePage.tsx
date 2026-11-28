"use client";

import { useLocale, useTranslations } from "next-intl";
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomePlatformSection } from "@/components/home/HomePlatformSection";
import { HomeTimelineSection } from "@/components/home/HomeTimelineSection";
import { HomeNetworkSection } from "@/components/home/HomeNetworkSection";
import { HomeIntegrationsSection } from "@/components/home/HomeIntegrationsSection";
import { HomePricingSection } from "@/components/home/HomePricingSection";
import { HomeFaqSection } from "@/components/home/HomeFaqSection";
import { WebMcpRegistrar } from "@/components/agent/WebMcpRegistrar";
import type {
  HomeCtaBannerCopy,
  HomeFaqCopy,
  HomeFooterCopy,
  HomeHeroCopy,
  HomeHeroPreviewCopy,
  HomeIntegrationsCopy,
  HomeNavCopy,
  HomeNetworksCopy,
  HomePlansCopy,
  HomePlatformCopy,
  HomeTimelineCopy,
} from "@/components/home/types";

export function HomePage() {
  const locale = useLocale();
  const t = useTranslations("home");
  const isRtl = locale === "ar";

  const nav: HomeNavCopy = {
    brandName: t("nav.brandName"),
    brandDescriptor: t("nav.brandDescriptor"),
    brandAriaLabel: t("nav.brandAriaLabel"),
    platform: t("nav.platform"),
    networks: t("nav.networks"),
    integrations: t("nav.integrations"),
    plans: t("nav.plans"),
    faq: t("nav.faq"),
    login: t("nav.login"),
    createAccount: t("nav.createAccount"),
    openMenu: t("nav.openMenu"),
    closeMenu: t("nav.closeMenu"),
    mobileDrawerLabel: t("nav.mobileDrawerLabel"),
    primaryNavLabel: t("nav.primaryNavLabel"),
  };

  const hero: HomeHeroCopy = {
    headlineLineOne: t("hero.headlineLineOne"),
    headlineLineTwo: t("hero.headlineLineTwo"),
    description: t("hero.description"),
    primaryCta: t("hero.primaryCta"),
    secondaryCta: t("hero.secondaryCta"),
    labels: {
      l1: t("hero.labels.l1"),
      l2: t("hero.labels.l2"),
      l3: t("hero.labels.l3"),
    },
  };

  const preview: HomeHeroPreviewCopy = {
    regionLabel: t("heroPreview.regionLabel"),
    workspacePath: t("heroPreview.workspacePath"),
    sampleBadge: t("heroPreview.sampleBadge"),
    companyLabel: t("heroPreview.companyLabel"),
    companyValue: t("heroPreview.companyValue"),
    branchLabel: t("heroPreview.branchLabel"),
    branchValue: t("heroPreview.branchValue"),
    sidebar: {
      overview: t("heroPreview.sidebar.overview"),
      sales: t("heroPreview.sidebar.sales"),
      operations: t("heroPreview.sidebar.operations"),
      finance: t("heroPreview.sidebar.finance"),
      settings: t("heroPreview.sidebar.settings"),
    },
    kpis: {
      totalLabel: t("heroPreview.kpis.totalLabel"),
      totalValue: t("heroPreview.kpis.totalValue"),
      availableLabel: t("heroPreview.kpis.availableLabel"),
      availableValue: t("heroPreview.kpis.availableValue"),
      activeLabel: t("heroPreview.kpis.activeLabel"),
      activeValue: t("heroPreview.kpis.activeValue"),
      returnsLabel: t("heroPreview.kpis.returnsLabel"),
      returnsValue: t("heroPreview.kpis.returnsValue"),
    },
    activityHeading: t("heroPreview.activityHeading"),
    activitySubheading: t("heroPreview.activitySubheading"),
    rows: {
      r1Vehicle: t("heroPreview.rows.r1Vehicle"),
      r1Meta: t("heroPreview.rows.r1Meta"),
      r1Amount: t("heroPreview.rows.r1Amount"),
      r1Status: t("heroPreview.rows.r1Status"),
      r2Vehicle: t("heroPreview.rows.r2Vehicle"),
      r2Meta: t("heroPreview.rows.r2Meta"),
      r2Amount: t("heroPreview.rows.r2Amount"),
      r2Status: t("heroPreview.rows.r2Status"),
      r3Vehicle: t("heroPreview.rows.r3Vehicle"),
      r3Meta: t("heroPreview.rows.r3Meta"),
      r3Amount: t("heroPreview.rows.r3Amount"),
      r3Status: t("heroPreview.rows.r3Status"),
    },
    branchSummaryTitle: t("heroPreview.branchSummaryTitle"),
    branchSummaryItems: {
      b1Name: t("heroPreview.branchSummaryItems.b1Name"),
      b1Meta: t("heroPreview.branchSummaryItems.b1Meta"),
      b1Value: t("heroPreview.branchSummaryItems.b1Value"),
      b2Name: t("heroPreview.branchSummaryItems.b2Name"),
      b2Meta: t("heroPreview.branchSummaryItems.b2Meta"),
      b2Value: t("heroPreview.branchSummaryItems.b2Value"),
    },
  };

  const platform: HomePlatformCopy = {
    headlineLineOne: t("platform.headlineLineOne"),
    headlineLineTwo: t("platform.headlineLineTwo"),
    description: t("platform.description"),
    pillars: {
      p1Title: t("platform.pillars.p1Title"),
      p1Desc: t("platform.pillars.p1Desc"),
      p2Title: t("platform.pillars.p2Title"),
      p2Desc: t("platform.pillars.p2Desc"),
      p3Title: t("platform.pillars.p3Title"),
      p3Desc: t("platform.pillars.p3Desc"),
    },
  };

  const timeline: HomeTimelineCopy = {
    eyebrow: t("timeline.eyebrow"),
    headline: t("timeline.headline"),
    description: t("timeline.description"),
    steps: {
      s1: t("timeline.steps.s1"),
      s2: t("timeline.steps.s2"),
      s3: t("timeline.steps.s3"),
      s4: t("timeline.steps.s4"),
    },
    board: {
      title: t("timeline.board.title"),
      subtitle: t("timeline.board.subtitle"),
      sampleBadge: t("timeline.board.sampleBadge"),
      legendAvailable: t("timeline.board.legendAvailable"),
      legendReserved: t("timeline.board.legendReserved"),
      legendOnRent: t("timeline.board.legendOnRent"),
      legendMaintenance: t("timeline.board.legendMaintenance"),
      bookingQueueStatus: t("timeline.board.bookingQueueStatus"),
      vehicleColLabel: t("timeline.board.vehicleColLabel"),
      sidebar: {
        overview: t("timeline.board.sidebar.overview"),
        sales: t("timeline.board.sidebar.sales"),
        operations: t("timeline.board.sidebar.operations"),
        timeline: t("timeline.board.sidebar.timeline"),
        finance: t("timeline.board.sidebar.finance"),
        settings: t("timeline.board.sidebar.settings"),
      },
      days: {
        mon: t("timeline.board.days.mon"),
        tue: t("timeline.board.days.tue"),
        wed: t("timeline.board.days.wed"),
        thu: t("timeline.board.days.thu"),
        fri: t("timeline.board.days.fri"),
        sat: t("timeline.board.days.sat"),
        sun: t("timeline.board.days.sun"),
      },
      groups: {
        compact: t("timeline.board.groups.compact"),
        suv: t("timeline.board.groups.suv"),
      },
      vehicles: {
        g1r1Model: t("timeline.board.vehicles.g1r1Model"),
        g1r1Plate: t("timeline.board.vehicles.g1r1Plate"),
        g1r1Bar: t("timeline.board.vehicles.g1r1Bar"),
        g1r2Model: t("timeline.board.vehicles.g1r2Model"),
        g1r2Plate: t("timeline.board.vehicles.g1r2Plate"),
        g1r2BarOne: t("timeline.board.vehicles.g1r2BarOne"),
        g1r2BarTwo: t("timeline.board.vehicles.g1r2BarTwo"),
        g1r3Model: t("timeline.board.vehicles.g1r3Model"),
        g1r3Plate: t("timeline.board.vehicles.g1r3Plate"),
        g1r3Bar: t("timeline.board.vehicles.g1r3Bar"),
        g2r1Model: t("timeline.board.vehicles.g2r1Model"),
        g2r1Plate: t("timeline.board.vehicles.g2r1Plate"),
        g2r1BarOne: t("timeline.board.vehicles.g2r1BarOne"),
        g2r1BarTwo: t("timeline.board.vehicles.g2r1BarTwo"),
        g2r2Model: t("timeline.board.vehicles.g2r2Model"),
        g2r2Plate: t("timeline.board.vehicles.g2r2Plate"),
        g2r2Bar: t("timeline.board.vehicles.g2r2Bar"),
      },
    },
  };

  const networks: HomeNetworksCopy = {
    eyebrow: t("networks.eyebrow"),
    headline: t("networks.headline"),
    description: t("networks.description"),
    supportingCopy: t("networks.supportingCopy"),
    independent: {
      title: t("networks.independent.title"),
      b1: t("networks.independent.b1"),
      b2: t("networks.independent.b2"),
      b3: t("networks.independent.b3"),
    },
    network: {
      title: t("networks.network.title"),
      b1: t("networks.network.b1"),
      b2: t("networks.network.b2"),
      b3: t("networks.network.b3"),
    },
    diagram: {
      mainLabel: t("networks.diagram.mainLabel"),
      mainTitle: t("networks.diagram.mainTitle"),
      mainScopeNote: t("networks.diagram.mainScopeNote"),
      permissionBadge: t("networks.diagram.permissionBadge"),
      privateBadge: t("networks.diagram.privateBadge"),
      partnerOneName: t("networks.diagram.partnerOneName"),
      partnerOneDetail: t("networks.diagram.partnerOneDetail"),
      partnerTwoName: t("networks.diagram.partnerTwoName"),
      partnerTwoDetail: t("networks.diagram.partnerTwoDetail"),
    },
  };

  const integrations: HomeIntegrationsCopy = {
    eyebrow: t("integrations.eyebrow"),
    headline: t("integrations.headline"),
    description: t("integrations.description"),
    plannedBadge: t("integrations.plannedBadge"),
    cards: {
      c1Title: t("integrations.cards.c1Title"),
      c1Desc: t("integrations.cards.c1Desc"),
      c2Title: t("integrations.cards.c2Title"),
      c2Desc: t("integrations.cards.c2Desc"),
      c3Title: t("integrations.cards.c3Title"),
      c3Desc: t("integrations.cards.c3Desc"),
    },
    notificationsTitle: t("integrations.notificationsTitle"),
    notificationsNote: t("integrations.notificationsNote"),
  };

  const plans: HomePlansCopy = {
    eyebrow: t("plans.eyebrow"),
    headline: t("plans.headline"),
    description: t("plans.description"),
    priceLabel: t("plans.priceLabel"),
    footnote: t("plans.footnote"),
    cards: {
      independentTitle: t("plans.cards.independentTitle"),
      independentDesc: t("plans.cards.independentDesc"),
      networkTitle: t("plans.cards.networkTitle"),
      networkDesc: t("plans.cards.networkDesc"),
    },
  };

  const faq: HomeFaqCopy = {
    headline: t("faq.headline"),
    subtitle: t("faq.subtitle"),
    items: [
      { id: "faq-q1", q: t("faq.items.q1"), a: t("faq.items.a1") },
      { id: "faq-q2", q: t("faq.items.q2"), a: t("faq.items.a2") },
      { id: "faq-q3", q: t("faq.items.q3"), a: t("faq.items.a3") },
      { id: "faq-q4", q: t("faq.items.q4"), a: t("faq.items.a4") },
      { id: "faq-q5", q: t("faq.items.q5"), a: t("faq.items.a5") },
      { id: "faq-q6", q: t("faq.items.q6"), a: t("faq.items.a6") },
      { id: "faq-q7", q: t("faq.items.q7"), a: t("faq.items.a7") },
    ],
  };

  const ctaBanner: HomeCtaBannerCopy = {
    headline: t("ctaBanner.headline"),
    description: t("ctaBanner.description"),
    primaryCta: t("ctaBanner.primaryCta"),
    secondaryCta: t("ctaBanner.secondaryCta"),
  };

  const footer: HomeFooterCopy = {
    brandName: t("footer.brandName"),
    brandDescriptor: t("footer.brandDescriptor"),
    description: t("footer.description"),
    copyrightName: t("footer.copyrightName"),
    links: {
      platform: t("footer.links.platform"),
      networks: t("footer.links.networks"),
      integrations: t("footer.links.integrations"),
      plans: t("footer.links.plans"),
      faq: t("footer.links.faq"),
    },
  };

  return (
    <div className="min-h-screen bg-revix-white text-revix-dark">
      <WebMcpRegistrar />
      {/* Sticky Navigation Wrapper floating cleanly inside the hero top edge at scroll=0 */}
      <div className="sticky top-2 z-40 pointer-events-none px-5 pt-3 sm:top-3 sm:px-8 sm:pt-4">
        <HomeNavbar nav={nav} />
      </div>

      <main>
        <HomeHeroSection isRtl={isRtl} hero={hero} preview={preview} />
        <HomePlatformSection platform={platform} />
        <HomeTimelineSection
          brandName={nav.brandName}
          brandDescriptor={nav.brandDescriptor}
          timeline={timeline}
        />
        <HomeNetworkSection networks={networks} />
        <HomeIntegrationsSection integrations={integrations} />
        <HomePricingSection plans={plans} />
        <HomeFaqSection
          isRtl={isRtl}
          faq={faq}
          ctaBanner={ctaBanner}
          footer={footer}
        />
      </main>
    </div>
  );
}
