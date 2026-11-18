export interface HomeNavCopy {
  brandName: string;
  brandDescriptor: string;
  brandAriaLabel: string;
  platform: string;
  networks: string;
  integrations: string;
  plans: string;
  faq: string;
  login: string;
  createAccount: string;
  openMenu: string;
  closeMenu: string;
  mobileDrawerLabel: string;
  primaryNavLabel: string;
}

export interface HomeHeroCopy {
  headlineLineOne: string;
  headlineLineTwo: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  labels: {
    l1: string;
    l2: string;
    l3: string;
  };
}

export interface HomeHeroPreviewCopy {
  regionLabel: string;
  workspacePath: string;
  sampleBadge: string;
  companyLabel: string;
  companyValue: string;
  branchLabel: string;
  branchValue: string;
  sidebar: {
    overview: string;
    sales: string;
    operations: string;
    finance: string;
    settings: string;
  };
  kpis: {
    totalLabel: string;
    totalValue: string;
    availableLabel: string;
    availableValue: string;
    activeLabel: string;
    activeValue: string;
    returnsLabel: string;
    returnsValue: string;
  };
  activityHeading: string;
  activitySubheading: string;
  rows: {
    r1Vehicle: string;
    r1Meta: string;
    r1Amount: string;
    r1Status: string;
    r2Vehicle: string;
    r2Meta: string;
    r2Amount: string;
    r2Status: string;
    r3Vehicle: string;
    r3Meta: string;
    r3Amount: string;
    r3Status: string;
  };
  branchSummaryTitle: string;
  branchSummaryItems: {
    b1Name: string;
    b1Meta: string;
    b1Value: string;
    b2Name: string;
    b2Meta: string;
    b2Value: string;
  };
}

export interface HomePlatformCopy {
  headlineLineOne: string;
  headlineLineTwo: string;
  description: string;
  pillars: {
    p1Title: string;
    p1Desc: string;
    p2Title: string;
    p2Desc: string;
    p3Title: string;
    p3Desc: string;
  };
}

export interface HomeTimelineCopy {
  eyebrow: string;
  headline: string;
  description: string;
  steps: {
    s1: string;
    s2: string;
    s3: string;
    s4: string;
  };
  board: {
    title: string;
    subtitle: string;
    sampleBadge: string;
    legendAvailable: string;
    legendReserved: string;
    legendOnRent: string;
    legendMaintenance: string;
    bookingQueueStatus: string;
    vehicleColLabel: string;
    sidebar: {
      overview: string;
      sales: string;
      operations: string;
      timeline: string;
      finance: string;
      settings: string;
    };
    days: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
      sun: string;
    };
    groups: {
      compact: string;
      suv: string;
    };
    vehicles: {
      g1r1Model: string;
      g1r1Plate: string;
      g1r1Bar: string;
      g1r2Model: string;
      g1r2Plate: string;
      g1r2BarOne: string;
      g1r2BarTwo: string;
      g1r3Model: string;
      g1r3Plate: string;
      g1r3Bar: string;
      g2r1Model: string;
      g2r1Plate: string;
      g2r1BarOne: string;
      g2r1BarTwo: string;
      g2r2Model: string;
      g2r2Plate: string;
      g2r2Bar: string;
    };
  };
}

export interface HomeNetworksCopy {
  eyebrow: string;
  headline: string;
  description: string;
  supportingCopy: string;
  independent: {
    title: string;
    b1: string;
    b2: string;
    b3: string;
  };
  network: {
    title: string;
    b1: string;
    b2: string;
    b3: string;
  };
  diagram: {
    mainLabel: string;
    mainTitle: string;
    mainScopeNote: string;
    permissionBadge: string;
    privateBadge: string;
    partnerOneName: string;
    partnerOneDetail: string;
    partnerTwoName: string;
    partnerTwoDetail: string;
  };
}

export interface HomeIntegrationsCopy {
  eyebrow: string;
  headline: string;
  description: string;
  plannedBadge: string;
  cards: {
    c1Title: string;
    c1Desc: string;
    c2Title: string;
    c2Desc: string;
    c3Title: string;
    c3Desc: string;
  };
  notificationsTitle: string;
  notificationsNote: string;
}

export interface HomePlansCopy {
  eyebrow: string;
  headline: string;
  description: string;
  priceLabel: string;
  footnote: string;
  cards: {
    independentTitle: string;
    independentDesc: string;
    networkTitle: string;
    networkDesc: string;
  };
}

export interface HomeFaqItem {
  id: string;
  q: string;
  a: string;
}

export interface HomeFaqCopy {
  headline: string;
  subtitle: string;
  items: HomeFaqItem[];
}

export interface HomeCtaBannerCopy {
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface HomeFooterCopy {
  brandName: string;
  brandDescriptor: string;
  description: string;
  copyrightName: string;
  links: {
    platform: string;
    networks: string;
    integrations: string;
    plans: string;
    faq: string;
  };
}
