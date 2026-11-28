"use client";
import dynamic from "next/dynamic";
import type { AuthUserDto } from "@/store/api/authApi";
import type { BranchDto, CompanyDto, WorkspaceMembershipDto } from "@/store/api/workspaceApi";
import { isDepartmentId } from "@/lib/workspace/departmentsCatalog";
import type { WorkspaceSubPageItem } from "@/lib/workspace/navigationCatalog";
import { useAppDispatch } from "@/store/hooks";
import { navigateToWorkspacePage, setSelectedBranchId, setCommandPaletteOpen, type WorkspaceSectionId } from "@/store/slices/workspaceSlice";
function PanelLoading() { return <div role="status" className="animate-pulse space-y-4" aria-label="Loading"><div className="h-8 w-48 rounded bg-revix-surface" /><div className="h-64 rounded-xl bg-revix-surface" /></div>; }
const PriceListPanel = dynamic(() => import("@/components/fleet/PriceListPanel").then((module) => module.PriceListPanel), { loading: PanelLoading });
const AccountSecurityPanel = dynamic(() => import("@/components/workspace/AccountSecurityPanel").then((module) => module.AccountSecurityPanel), { loading: PanelLoading });
const CompanyNetworkPanel = dynamic(() => import("@/components/workspace/CompanyNetworkPanel").then((module) => module.CompanyNetworkPanel), { loading: PanelLoading });
const CompanySettingsPanel = dynamic(() => import("@/components/workspace/CompanySettingsPanel").then((module) => module.CompanySettingsPanel), { loading: PanelLoading });
const ContractTermsSettingsPanel = dynamic(() => import("@/components/workspace/ContractTermsSettingsPanel").then((module) => module.ContractTermsSettingsPanel), { loading: PanelLoading });
const LocationsManager = dynamic(() => import("@/components/workspace/LocationsManager").then((module) => module.LocationsManager), { loading: PanelLoading });
const RolesMatrixPanel = dynamic(() => import("@/components/workspace/RolesMatrixPanel").then((module) => module.RolesMatrixPanel), { loading: PanelLoading });
const TeamMembersPanel = dynamic(() => import("@/components/workspace/TeamMembersPanel").then((module) => module.TeamMembersPanel), { loading: PanelLoading });
const UpcomingModuleBlueprint = dynamic(() => import("@/components/workspace/UpcomingModuleBlueprint").then((module) => module.UpcomingModuleBlueprint), { loading: PanelLoading });
const WorkspaceWelcomePanel = dynamic(() => import("@/components/workspace/WorkspaceWelcomePanel").then((module) => module.WorkspaceWelcomePanel), { loading: PanelLoading });
const DepartmentHubPanel = dynamic(() => import("@/components/workspace/DepartmentHubPanel").then((module) => module.DepartmentHubPanel), { loading: PanelLoading });
const FleetVehiclesPanel = dynamic(() => import("@/components/fleet/FleetVehiclesPanel").then((module) => module.FleetVehiclesPanel), { loading: PanelLoading });
const AddFleetVehiclePage = dynamic(() => import("@/components/fleet/AddFleetVehiclePage").then((module) => module.AddFleetVehiclePage), { loading: PanelLoading });
const VehiclePhotosPage = dynamic(() => import("@/components/fleet/VehiclePhotosPage").then((module) => module.VehiclePhotosPage), { loading: PanelLoading });
const RentalInclusionsPage = dynamic(() => import("@/components/fleet/RentalInclusionsPage").then((module) => module.RentalInclusionsPage), { loading: PanelLoading });
const PurchaseOrdersPanel = dynamic(() => import("@/components/fleet/PurchaseOrdersPanel").then((module) => module.PurchaseOrdersPanel), { loading: PanelLoading });
const VehicleVariantsPanel = dynamic(() => import("@/components/fleet/VehicleVariantsPanel").then((module) => module.VehicleVariantsPanel), { loading: PanelLoading });
const VendorsDirectoryPanel = dynamic(() => import("@/components/fleet/VendorsDirectoryPanel").then((module) => module.VendorsDirectoryPanel), { loading: PanelLoading });
const InsuranceCompaniesPanel = dynamic(() => import("@/components/fleet/InsuranceCompaniesPanel").then((module) => module.InsuranceCompaniesPanel), { loading: PanelLoading });
const BookableFleetPanel = dynamic(() => import("@/components/fleet/BookableFleetPanel").then((module) => module.BookableFleetPanel), { loading: PanelLoading });
const CustomersPanel = dynamic(() => import("@/components/fleet/CustomersPanel").then((module) => module.CustomersPanel), { loading: PanelLoading });
const RentalContractsPanel = dynamic(() => import("@/components/fleet/RentalContractsPanel").then((module) => module.RentalContractsPanel), { loading: PanelLoading });
const RentalCalendarPanel = dynamic(() => import("@/components/fleet/RentalCalendarPanel").then((module) => module.RentalCalendarPanel), { loading: PanelLoading });
const FleetMovementsPanel = dynamic(() => import("@/components/fleet/FleetMovementsPanel").then((module) => module.FleetMovementsPanel), { loading: PanelLoading });
const DriversPanel = dynamic(() => import("@/components/fleet/DriversPanel").then((module) => module.DriversPanel), { loading: PanelLoading });
const VehicleColorsMasterPanel = dynamic(() => import("@/components/fleet/VehicleColorsMasterPanel").then((module) => module.VehicleColorsMasterPanel), { loading: PanelLoading });
const VehicleModelsMasterPanel = dynamic(() => import("@/components/fleet/VehicleModelsMasterPanel").then((module) => module.VehicleModelsMasterPanel), { loading: PanelLoading });
const BodyStylesMasterPanel = dynamic(() => import("@/components/fleet/BodyStylesMasterPanel").then((module) => module.BodyStylesMasterPanel), { loading: PanelLoading });
interface WorkspacePageContentProps {
 isRtl: boolean; activeSection: WorkspaceSectionId; activeSubPage: string;
 canAccessCurrentPage: boolean; canAccessTeam: boolean; company: CompanyDto;
 branches: BranchDto[]; user: AuthUserDto; membership: WorkspaceMembershipDto | null;
 activeBranch: BranchDto | null; currentSubPageConfig: WorkspaceSubPageItem | undefined;
 isFetching: boolean; onRefresh: () => void;
}
export function WorkspacePageContent({ isRtl, activeSection, activeSubPage, canAccessCurrentPage, canAccessTeam, company, branches, user, membership, activeBranch, currentSubPageConfig, isFetching, onRefresh }: WorkspacePageContentProps) {
 const dispatch = useAppDispatch();
 return (!canAccessCurrentPage ? null : activeSection === "settings" && activeSubPage === "locations" ? (
            <LocationsManager
              isRtl={isRtl}
              company={company}
              branches={branches}
              onRefresh={onRefresh}
              isRefreshing={isFetching}
            />
          ) : activeSection === "settings" &&
            activeSubPage === "company-profile" ? (
            <CompanySettingsPanel isRtl={isRtl} company={company} />
          ) : activeSection === "settings" &&
            activeSubPage === "contract-terms" ? (
            <ContractTermsSettingsPanel isRtl={isRtl} company={company} />
          ) : activeSection === "settings" && activeSubPage === "security" ? (
            <AccountSecurityPanel
              isRtl={isRtl}
              user={user}
              membership={membership}
              company={company}
              branches={branches}
            />
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
          ) : activeSection === "fleet" && activeSubPage === "insurance-companies" ? (
            <InsuranceCompaniesPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "fleet-live" ? (
            <BookableFleetPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "customers" ? (
            <CustomersPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "rental-contracts" ? (
            <RentalContractsPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "rental-calendar" ? (
            <RentalCalendarPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "movements" ? (
            <FleetMovementsPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "drivers" ? (
            <DriversPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "colors" ? (
            <VehicleColorsMasterPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "models" ? (
            <VehicleModelsMasterPanel isRtl={isRtl} />
          ) : activeSection === "fleet" && activeSubPage === "body-styles" ? (
            <BodyStylesMasterPanel isRtl={isRtl} />
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
          ) : activeSection === "fleet" && activeSubPage === "price-list" ? (
            <PriceListPanel
              isRtl={isRtl}
              baseCurrency={activeBranch?.currencyCode || company?.baseCurrency}
            />
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
            <WorkspaceWelcomePanel
              isRtl={isRtl}
              company={company}
              activeBranch={activeBranch}
              user={user}
              membership={membership}
              onNavigate={(section, subPage) =>
                dispatch(navigateToWorkspacePage({ section, subPage }))
              }
            />
          ) : activeSection === "overview" && isDepartmentId(activeSubPage) ? (
            <DepartmentHubPanel
              isRtl={isRtl}
              departmentId={activeSubPage}
              company={company}
              membership={membership}
              onNavigate={(section, subPage) =>
                dispatch(navigateToWorkspacePage({ section, subPage }))
              }
              onBack={() =>
                dispatch(
                  navigateToWorkspacePage({
                    section: "overview",
                    subPage: "summary",
                  }),
                )
              }
            />
          ) : (
            <UpcomingModuleBlueprint
              isRtl={isRtl}
              company={company}
              activeBranch={activeBranch}
              subPage={currentSubPageConfig}
            />
          ));
}
