"use client";
import { WorkspacePageContent } from "./WorkspacePageContent";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { RevixIcon } from "@/components/ui/RevixIcons";

import {
  StudioMobileDrawer,
  StudioTopBar,
} from "@/components/shared/workspace";

import { CommandPaletteModal } from "@/components/workspace/CommandPaletteModal";

import {
  buildWorkspaceHref,
  canAccessWorkspacePage,
  getReadyWorkspaceNavigationSections,
  isOwnerOrCeo,
  parseWorkspacePathname,
} from "@/lib/workspace/navigationCatalog";
import { useLogoutMutation } from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearPendingUrlPush,
  navigateToWorkspacePage,
  setCommandPaletteOpen,
  setSelectedBranchId,
  syncRouteFromUrl,
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

  const storedSection = useAppSelector(
    (state) => state.workspace.activeSection,
  );
  const storedSubPage = useAppSelector(
    (state) => state.workspace.activeSubPage,
  );
  const selectedBranchId = useAppSelector(
    (state) => state.workspace.selectedBranchId,
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

  const route = pathname ? parseWorkspacePathname(pathname) : { section: initialSection ?? "overview", subPage: initialSubPage ?? "summary" };
  const activeSection = pendingUrlPush ? storedSection : route.section;
  const activeSubPage = pendingUrlPush ? storedSubPage : route.subPage;

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

    // Keep resource detail URLs intact while the workspace section remains the same.
    const currentResourcePath = (pathname || "").replace(/^\/(en|ar)(?=\/|$)/, "");
    const isFleetResourceDetail =
      activeSection === "fleet" &&
      ((activeSubPage === "vehicles" && /^\/workspace\/fleet\/vehicles\/[^/]+/.test(currentResourcePath)) ||
        (activeSubPage === "purchase-orders" && /^\/workspace\/fleet\/purchase-orders\/[^/]+/.test(currentResourcePath)));
    if (isFleetResourceDetail) return;

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
    if (!company || !user) return;
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
  }, [activeSection, activeSubPage, availableSections, company, user, dispatch]);

  const currentSectionConfig = useMemo(() => {
    return (
      availableSections.find((s) => s.id === activeSection) ??
      availableSections[0]
    );
  }, [activeSection, availableSections]);

  const currentSubPageConfig = useMemo(() => {
    for (const group of currentSectionConfig?.groups ?? []) {
      const found = group.items.find((item) => item.id === activeSubPage);
      if (found) return found;
    }
    return currentSectionConfig?.groups[0]?.items[0];
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

  if (error && extractApiErrorCode(error) !== "UNAUTHORIZED" && extractApiErrorCode(error) !== "EMAIL_NOT_VERIFIED") {
    return <div role="alert" dir={isRtl ? "rtl" : "ltr"} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-revix-surface p-6 text-revix-dark"><p>{isRtl ? "تعذر تحميل مساحة العمل. تحقق من الاتصال وحاول مرة أخرى." : "Could not load your workspace. Check your connection and try again."}</p><button type="button" onClick={() => { void refetch(); }} className="rounded-lg bg-revix-primary px-5 py-2 text-white">{isRtl ? "إعادة المحاولة" : "Try again"}</button></div>;
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
                    sec.id === "fleet" && sec.groups.length > 1 ? (
                      <div className="space-y-2.5 ps-1 pt-0.5">
                        {sec.groups.map((grp, gIdx) => (
                          <div key={grp.groupTitleEn} className={gIdx > 0 ? "border-t border-revix-border/60 pt-2" : ""}>
                            <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wide text-revix-muted">
                              {isRtl ? grp.groupTitleAr : grp.groupTitleEn}
                            </div>
                            <div className="space-y-0.5">
                              {grp.items.map((item) => {
                                const isActive =
                                  activeSection === sec.id &&
                                  activeSubPage === item.id;
                                return (
                                  <button
                                    key={`${sec.id}-${item.id}`}
                                    type="button"
                                    onClick={() =>
                                      dispatch(
                                        navigateToWorkspacePage({
                                          section: sec.id,
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
                          </div>
                        ))}
                      </div>
                    ) : (
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
                    )
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
          <WorkspacePageContent isRtl={isRtl}
            activeSection={activeSection}
            activeSubPage={activeSubPage}
            canAccessCurrentPage={canAccessCurrentPage}
            canAccessTeam={canAccessTeam}
            company={company}
            branches={branches}
            user={user}
            membership={membership}
            activeBranch={activeBranch}
            currentSubPageConfig={currentSubPageConfig}
            isFetching={isFetching}
            onRefresh={() => { void refetch(); }} />
        </main>
      </div>

      <CommandPaletteModal isRtl={isRtl} />
    </div>
  );
}
