"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  StudioIconRail,
  StudioMobileDrawer,
  StudioSubSidebar,
  StudioTopBar,
} from "@/components/shared/workspace";
import { AccountSecurityPanel } from "@/components/workspace/AccountSecurityPanel";
import { CommandPaletteModal } from "@/components/workspace/CommandPaletteModal";
import { CompanyNetworkPanel } from "@/components/workspace/CompanyNetworkPanel";
import { CompanySettingsPanel } from "@/components/workspace/CompanySettingsPanel";
import { LocationsManager } from "@/components/workspace/LocationsManager";
import { RolesMatrixPanel } from "@/components/workspace/RolesMatrixPanel";
import { TeamMembersPanel } from "@/components/workspace/TeamMembersPanel";
import { UpcomingModuleBlueprint } from "@/components/workspace/UpcomingModuleBlueprint";
import { WorkspaceOverviewPanel } from "@/components/workspace/WorkspaceOverviewPanel";
import { FleetVehiclesPanel } from "@/components/fleet/FleetVehiclesPanel";
import { AddFleetVehiclePage } from "@/components/fleet/AddFleetVehiclePage";
import { VehiclePhotosPage } from "@/components/fleet/VehiclePhotosPage";
import { RentalInclusionsPage } from "@/components/fleet/RentalInclusionsPage";
import { PurchaseOrdersPanel } from "@/components/fleet/PurchaseOrdersPanel";
import { VehicleVariantsPanel } from "@/components/fleet/VehicleVariantsPanel";
import { VendorsDirectoryPanel } from "@/components/fleet/VendorsDirectoryPanel";
import {
  buildWorkspaceHref,
  canAccessWorkspacePage,
  getReadyWorkspaceNavigationSections,
  isOwnerOrCeo,
  parseWorkspacePathname,
  READY_WORKSPACE_NAVIGATION_SECTIONS,
  WORKSPACE_NAVIGATION_SECTIONS,
} from "@/lib/workspace/navigationCatalog";
import { useLogoutMutation } from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearPendingUrlPush,
  navigateToWorkspacePage,
  setActiveSection,
  setCommandPaletteOpen,
  setSelectedBranchId,
  syncRouteFromUrl,
  toggleIconRailPinned,
  type WorkspaceSectionId,
} from "@/store/slices/workspaceSlice";

export interface WorkspaceStudioShellProps {
  isRtl: boolean;
  initialSection?: WorkspaceSectionId;
  initialSubPage?: string;
}

export function WorkspaceStudioShell({
  isRtl,
  initialSection,
  initialSubPage,
}: WorkspaceStudioShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { data, isLoading, isFetching, error, refetch } =
    useGetWorkspaceContextQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const activeSection = useAppSelector(
    (state) => state.workspace.activeSection,
  );
  const activeSubPage = useAppSelector(
    (state) => state.workspace.activeSubPage,
  );
  const selectedBranchId = useAppSelector(
    (state) => state.workspace.selectedBranchId,
  );
  const isIconRailPinned = useAppSelector(
    (state) => state.workspace.isIconRailPinned,
  );
  const isCommandPaletteOpen = useAppSelector(
    (state) => state.workspace.isCommandPaletteOpen,
  );
  const pageByRoute = useAppSelector(
    (state) => state.workspace.pageByRoute,
  );
  const pendingUrlPush = useAppSelector(
    (state) => state.workspace.pendingUrlPush,
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSidebarSections, setOpenSidebarSections] = useState<
    Record<string, boolean>
  >(() => ({ [activeSection]: true }));
  const gChordActiveRef = useRef(false);
  const gChordTimerRef = useRef<number | null>(null);

  // 1. Sync URL pathname -> Redux (handles initial load, F5 refresh, and Browser Back/Forward)
  useEffect(() => {
    const parsed = parseWorkspacePathname(pathname || "/workspace");
    dispatch(syncRouteFromUrl(parsed));
  }, [pathname, dispatch]);

  // 2. Sync Redux -> URL pathname ONLY when triggered by user interaction (pendingUrlPush)
  useEffect(() => {
    if (!pendingUrlPush) return;
    dispatch(clearPendingUrlPush());

    const routeKey = `${activeSection}/${activeSubPage}`;
    const targetHref = buildWorkspaceHref(activeSection, activeSubPage);
    const cleanPathname =
      (pathname || "/workspace").replace(/^\/(en|ar)(?=\/|$)/, "") || "/workspace";

    if (cleanPathname !== targetHref) {
      const savedPage = pageByRoute[routeKey];
      const fullTarget =
        savedPage && savedPage > 1 ? `${targetHref}?page=${savedPage}` : targetHref;
      router.push(fullTarget);
    }
  }, [pendingUrlPush, activeSection, activeSubPage, pathname, router, pageByRoute, dispatch]);

  const user = data?.data.user ?? null;
  const company = data?.data.company ?? null;
  const branches = useMemo(() => data?.data.branches ?? [], [data?.data.branches]);
  const membership = data?.data.membership ?? null;
  const onboardingState = data?.data.onboardingState;

  const canAccessTeam = isOwnerOrCeo(membership);
  const canAccessCurrentPage = canAccessWorkspacePage(
    activeSection,
    activeSubPage,
    company?.operatingMode,
    membership,
  );

  const availableSections = useMemo(() => {
    return getReadyWorkspaceNavigationSections(
      company?.operatingMode,
      membership,
    );
  }, [company?.operatingMode, membership]);

  useEffect(() => {
    if (error) {
      const code = extractApiErrorCode(error);
      if (code === "UNAUTHORIZED") {
        router.push("/login");
      } else if (code === "EMAIL_NOT_VERIFIED") {
        router.push("/verify-email");
      }
      return;
    }

    if (
      onboardingState === "needs_company" ||
      onboardingState === "needs_first_branch"
    ) {
      router.push("/onboarding");
    }
  }, [error, onboardingState, router]);

  // Global Keyboard Shortcuts: Ctrl+K, Alt+1..8, and G + <letter>
  useEffect(() => {
    function isTypingElement(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.code === "KeyK" || event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        dispatch(setCommandPaletteOpen(!isCommandPaletteOpen));
        return;
      }

      if (isCommandPaletteOpen || isTypingElement(event.target)) {
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const digitFromKey = Number.parseInt(event.key, 10);
        const digitFromCode = event.code.startsWith("Digit")
          ? Number.parseInt(event.code.slice(5), 10)
          : Number.NaN;
        const digit = Number.isNaN(digitFromKey) ? digitFromCode : digitFromKey;
        if (digit >= 1 && digit <= availableSections.length) {
          event.preventDefault();
          const targetSection = availableSections[digit - 1];
          if (targetSection) {
            const firstSubPage =
              targetSection.groups[0]?.items[0]?.id || "summary";
            dispatch(
              navigateToWorkspacePage({
                section: targetSection.id,
                subPage: firstSubPage,
              }),
            );
          }
          return;
        }
      }

      const lowerKey = event.code.startsWith("Key")
        ? event.code.slice(3).toLowerCase()
        : event.key.toLowerCase();
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (lowerKey === "g" && !gChordActiveRef.current) {
          gChordActiveRef.current = true;
          if (gChordTimerRef.current) {
            window.clearTimeout(gChordTimerRef.current);
          }
          gChordTimerRef.current = window.setTimeout(() => {
            gChordActiveRef.current = false;
          }, 900);
          return;
        }

        if (gChordActiveRef.current) {
          gChordActiveRef.current = false;
          if (gChordTimerRef.current) {
            window.clearTimeout(gChordTimerRef.current);
          }

          for (const section of availableSections) {
            for (const group of section.groups) {
              const match = group.items.find(
                (item) => item.keyCode === lowerKey,
              );
              if (match) {
                event.preventDefault();
                dispatch(
                  navigateToWorkspacePage({
                    section: section.id,
                    subPage: match.id,
                  }),
                );
                return;
              }
            }
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gChordTimerRef.current) {
        window.clearTimeout(gChordTimerRef.current);
      }
    };
  }, [availableSections, dispatch, isCommandPaletteOpen]);

  // Guard: if current activeSection/activeSubPage is not in available sections, redirect to first ready page
  useEffect(() => {
    const matchedSection = availableSections.find((s) => s.id === activeSection);
    const hasSubPage = Boolean(
      matchedSection?.groups.some((g) =>
        g.items.some((item) => item.id === activeSubPage),
      ),
    );
    if ((!matchedSection || !hasSubPage) && availableSections[0]) {
      const targetSec = matchedSection ?? availableSections[0];
      const fallbackSub = targetSec.groups[0]?.items[0]?.id || "summary";
      dispatch(
        navigateToWorkspacePage({
          section: targetSec.id,
          subPage: fallbackSub,
        }),
      );
    }
  }, [activeSection, activeSubPage, availableSections, dispatch]);

  const currentSectionConfig = useMemo(() => {
    return (
      availableSections.find((s) => s.id === activeSection) ??
      availableSections[0]
    );
  }, [activeSection, availableSections]);

  const currentSubPageConfig = useMemo(() => {
    for (const group of currentSectionConfig.groups) {
      const found = group.items.find((item) => item.id === activeSubPage);
      if (found) return found;
    }
    return currentSectionConfig.groups[0]?.items[0];
  }, [activeSubPage, currentSectionConfig]);

  const activeBranch = useMemo(() => {
    return (
      branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null
    );
  }, [branches, selectedBranchId]);

  async function handleLogout() {
    try {
      await logout().unwrap();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  }

  if (isLoading || !company || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-revix-surface text-[14px] text-revix-secondary">
        {isRtl ? "جاري تحميل مساحة العمل..." : "Loading Revix workspace..."}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-revix-white text-revix-dark">
      <StudioTopBar
        isRtl={isRtl}
        company={company}
        user={user}
        branches={branches}
        activeBranch={activeBranch}
        isLoggingOut={isLoggingOut}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onGoHome={() =>
          dispatch(
            navigateToWorkspacePage({
              section: "overview",
              subPage: "summary",
            }),
          )
        }
        onGoCompanySettings={() =>
          dispatch(
            navigateToWorkspacePage({
              section: "settings",
              subPage: "company-profile",
            }),
          )
        }
        onSelectBranch={(id) => dispatch(setSelectedBranchId(id))}
        onOpenCommandPalette={() => dispatch(setCommandPaletteOpen(true))}
        onGoSecurity={() =>
          dispatch(
            navigateToWorkspacePage({
              section: "settings",
              subPage: "security",
            }),
          )
        }
        onLogout={handleLogout}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label={isRtl ? "القائمة الجانبية" : "Workspace navigation"}
          className="hidden md:flex w-[240px] shrink-0 flex-col gap-2 overflow-y-auto border-e border-revix-border bg-revix-surface/40 px-2.5 py-3"
        >
          {availableSections
            .filter((sec) => sec.id !== "network" && sec.id !== "team")
            .map((sec) => {
              const mergedItems =
                sec.id === "settings"
                  ? [
                      ...sec.groups.flatMap((g) => g.items).map((item) => ({
                        sectionId: sec.id,
                        item,
                      })),
                      ...availableSections
                        .filter((s) => s.id === "network" || s.id === "team")
                        .flatMap((s) =>
                          s.groups.flatMap((g) =>
                            g.items.map((item) => ({
                              sectionId: s.id,
                              item,
                            })),
                          ),
                        ),
                    ]
                  : sec.groups.flatMap((g) => g.items).map((item) => ({
                      sectionId: sec.id,
                      item,
                    }));

              const isSectionActive =
                activeSection === sec.id ||
                (sec.id === "settings" &&
                  (activeSection === "network" || activeSection === "team"));
              const isExpanded =
                openSidebarSections[sec.id] ?? isSectionActive;

              return (
                <div key={sec.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSidebarSections((prev) => ({
                        ...prev,
                        [sec.id]: !(prev[sec.id] ?? isSectionActive),
                      }))
                    }
                    className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 text-start text-[11px] font-semibold uppercase tracking-wider text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
                  >
                    <span className="truncate">
                      {isRtl ? sec.titleAr : sec.titleEn}
                    </span>
                    <RevixIcon
                      name="chevron-down"
                      size={12}
                      className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isExpanded ? (
                    <div className="space-y-0.5 ps-1">
                      {mergedItems.map(({ sectionId, item }) => {
                        const isActive =
                          activeSection === sectionId &&
                          activeSubPage === item.id;
                        return (
                          <button
                            key={`${sectionId}-${item.id}`}
                            type="button"
                            onClick={() =>
                              dispatch(
                                navigateToWorkspacePage({
                                  section: sectionId,
                                  subPage: item.id,
                                }),
                              )
                            }
                            className={`flex w-full cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-start text-[13px] transition-colors ${
                              isActive
                                ? "bg-revix-tint font-semibold text-revix-primary"
                                : "font-medium text-revix-dark hover:bg-revix-surface"
                            }`}
                          >
                            <span className="truncate">
                              {isRtl ? item.titleAr : item.titleEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </aside>

        <StudioMobileDrawer
          isRtl={isRtl}
          isOpen={mobileMenuOpen}
          company={company}
          user={user}
          branches={branches}
          activeBranch={activeBranch}
          sections={availableSections}
          activeSection={activeSection}
          activeSubPage={activeSubPage}
          isLoggingOut={isLoggingOut}
          onClose={() => setMobileMenuOpen(false)}
          onSelectPage={(section, subPage) =>
            dispatch(navigateToWorkspacePage({ section, subPage }))
          }
          onSelectBranch={(id) => dispatch(setSelectedBranchId(id))}
          onGoCompanySettings={() =>
            dispatch(
              navigateToWorkspacePage({
                section: "settings",
                subPage: "company-profile",
              }),
            )
          }
          onGoSecurity={() =>
            dispatch(
              navigateToWorkspacePage({
                section: "settings",
                subPage: "security",
              }),
            )
          }
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 overflow-y-auto bg-revix-white p-3.5 sm:p-6 lg:p-7">
          {!canAccessCurrentPage ? null : activeSection === "settings" && activeSubPage === "locations" ? (
            <LocationsManager
              isRtl={isRtl}
              company={company}
              branches={branches}
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
            />
          ) : activeSection === "settings" &&
            activeSubPage === "company-profile" ? (
            <CompanySettingsPanel isRtl={isRtl} company={company} />
          ) : activeSection === "settings" && activeSubPage === "security" ? (
            <AccountSecurityPanel isRtl={isRtl} user={user} />
          ) : activeSection === "team" && activeSubPage === "members" && canAccessTeam ? (
            <TeamMembersPanel isRtl={isRtl} membership={membership} />
          ) : activeSection === "team" && activeSubPage === "roles" && canAccessTeam ? (
            <RolesMatrixPanel isRtl={isRtl} membership={membership} />
          ) : activeSection === "network" &&
            activeSubPage === "local-companies" &&
            company?.operatingMode !== "independent" ? (
            <CompanyNetworkPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "variants" ? (
            <VehicleVariantsPanel
              isRtl={isRtl}
              baseCurrency={activeBranch?.currencyCode || company?.baseCurrency}
              onGoFleetVehicles={() =>
                dispatch(
                  navigateToWorkspacePage({
                    section: "fleet",
                    subPage: "vehicles",
                  }),
                )
              }
            />
          ) : activeSection === "fleet" && activeSubPage === "vendors" ? (
            <VendorsDirectoryPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "purchase-orders" ? (
            <PurchaseOrdersPanel
              isRtl={isRtl}
              branches={branches}
              activeBranch={activeBranch}
            />
          ) : activeSection === "fleet" && activeSubPage === "add-vehicle" ? (
            <AddFleetVehiclePage lang={isRtl ? "ar" : "en"} />
          ) : activeSection === "fleet" && activeSubPage === "vehicle-photos" ? (
            <VehiclePhotosPage lang={isRtl ? "ar" : "en"} />
          ) : activeSection === "fleet" && activeSubPage === "rental-inclusions" ? (
            <RentalInclusionsPage lang={isRtl ? "ar" : "en"} />
          ) : activeSection === "fleet" && activeSubPage === "vehicles" ? (
            <FleetVehiclesPanel
              isRtl={isRtl}
              branches={branches}
              activeBranch={activeBranch}
              company={company}
              onGoVariants={() =>
                dispatch(
                  navigateToWorkspacePage({
                    section: "fleet",
                    subPage: "variants",
                  }),
                )
              }
              onGoPurchaseOrders={() =>
                dispatch(
                  navigateToWorkspacePage({
                    section: "fleet",
                    subPage: "purchase-orders",
                  }),
                )
              }
            />
          ) : activeSection === "overview" && activeSubPage === "summary" ? (
            <WorkspaceOverviewPanel
              isRtl={isRtl}
              company={company}
              branches={branches}
              user={user}
              membership={membership}
              activeBranch={activeBranch}
              onSelectBranch={(id) => dispatch(setSelectedBranchId(id))}
              onNavigate={(section, subPage) =>
                dispatch(navigateToWorkspacePage({ section, subPage }))
              }
              onOpenCommandPalette={() => dispatch(setCommandPaletteOpen(true))}
            />
          ) : (
            <UpcomingModuleBlueprint
              isRtl={isRtl}
              company={company}
              activeBranch={activeBranch}
              subPage={currentSubPageConfig}
            />
          )}
        </main>
      </div>

      <CommandPaletteModal isRtl={isRtl} />
    </div>
  );
}
