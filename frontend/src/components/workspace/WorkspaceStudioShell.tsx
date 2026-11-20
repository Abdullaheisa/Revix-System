"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  getReadyWorkspaceNavigationSections,
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

  const availableSections = useMemo(() => {
    return getReadyWorkspaceNavigationSections(company?.operatingMode);
  }, [company?.operatingMode]);

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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dispatch(setCommandPaletteOpen(!isCommandPaletteOpen));
        return;
      }

      if (isCommandPaletteOpen || isTypingElement(event.target)) {
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const digit = Number.parseInt(event.key, 10);
        if (digit >= 1 && digit <= availableSections.length) {
          event.preventDefault();
          const targetSection = availableSections[digit - 1];
          if (targetSection) {
            dispatch(setActiveSection(targetSection.id));
          }
          return;
        }
      }

      const lowerKey = event.key.toLowerCase();
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

  // Guard: if current activeSection is not in available sections, redirect to first ready section
  useEffect(() => {
    const isReady = availableSections.some(
      (s) => s.id === activeSection,
    );
    if (!isReady && availableSections[0]) {
      const fallbackSec = availableSections[0];
      const fallbackSub = fallbackSec.groups[0]?.items[0]?.id || "summary";
      dispatch(
        navigateToWorkspacePage({
          section: fallbackSec.id,
          subPage: fallbackSub,
        }),
      );
    }
  }, [activeSection, availableSections, dispatch]);

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
        <StudioIconRail
          isRtl={isRtl}
          sections={availableSections}
          activeSection={activeSection}
          isPinned={isIconRailPinned}
          onSelectSection={(sec) => dispatch(setActiveSection(sec))}
          onTogglePin={() => dispatch(toggleIconRailPinned())}
        />

        <StudioSubSidebar
          isRtl={isRtl}
          section={currentSectionConfig}
          activeSubPage={activeSubPage}
          onSelectSubPage={(section, subPage) =>
            dispatch(navigateToWorkspacePage({ section, subPage }))
          }
        />

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
          {activeSection === "settings" && activeSubPage === "locations" ? (
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
          ) : activeSection === "team" && activeSubPage === "members" ? (
            <TeamMembersPanel isRtl={isRtl} membership={membership} />
          ) : activeSection === "team" && activeSubPage === "roles" ? (
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
