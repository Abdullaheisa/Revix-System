import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { workspaceApi } from "../api/workspaceApi";
import { normalizePage } from "../../lib/workspace/pagination";

export type WorkspaceSectionId =
  | "overview"
  | "sales"
  | "fleet"
  | "operations"
  | "finance"
  | "network"
  | "team"
  | "settings";

export interface PendingFleetReceiveContext {
  purchaseOrderId: string;
  itemId: string;
  variantId: string;
  branchId?: string;
  poNumber?: string;
  unitPrice?: number;
  vin?: string;
  color?: string;
}

export interface PendingVariantSetupContext {
  variantId: string;
  variantTitle: string;
  totalUnits: number;
}

export interface WorkspaceUiState {
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  selectedBranchId: string | null;
  isCommandPaletteOpen: boolean;
  isIconRailPinned: boolean;
  pendingFleetReceiveContext: PendingFleetReceiveContext | null;
  pendingVariantSetupContext: PendingVariantSetupContext | null;
  pageByRoute: Record<string, number>;
  pendingUrlPush: boolean;
}

const DEFAULT_SUBPAGE_BY_SECTION: Record<WorkspaceSectionId, string> = {
  overview: "summary",
  sales: "bookings",
  fleet: "purchase-orders",
  operations: "readiness",
  finance: "approvals",
  network: "local-companies",
  team: "members",
  settings: "locations",
};

const initialState: WorkspaceUiState = {
  activeSection: "overview",
  activeSubPage: "summary",
  selectedBranchId: null,
  isCommandPaletteOpen: false,
  isIconRailPinned: false,
  pendingFleetReceiveContext: null,
  pendingVariantSetupContext: null,
  pageByRoute: {},
  pendingUrlPush: false,
};

export const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setActiveSection(state, action: PayloadAction<WorkspaceSectionId>) {
      state.activeSection = action.payload;
      state.activeSubPage = DEFAULT_SUBPAGE_BY_SECTION[action.payload];
      state.pendingUrlPush = true;
    },
    navigateToWorkspacePage(
      state,
      action: PayloadAction<{ section: WorkspaceSectionId; subPage: string }>,
    ) {
      state.activeSection = action.payload.section;
      state.activeSubPage = action.payload.subPage;
      state.isCommandPaletteOpen = false;
      state.pendingUrlPush = true;
    },
    syncRouteFromUrl(
      state,
      action: PayloadAction<{ section: WorkspaceSectionId; subPage: string }>,
    ) {
      state.activeSection = action.payload.section;
      state.activeSubPage = action.payload.subPage;
      state.pendingUrlPush = false;
    },
    clearPendingUrlPush(state) {
      state.pendingUrlPush = false;
    },
    setSelectedBranchId(state, action: PayloadAction<string | null>) {
      state.selectedBranchId = action.payload;
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.isCommandPaletteOpen = action.payload;
    },
    toggleIconRailPinned(state) {
      state.isIconRailPinned = !state.isIconRailPinned;
    },
    setPendingFleetReceiveContext(
      state,
      action: PayloadAction<PendingFleetReceiveContext | null>,
    ) {
      state.pendingFleetReceiveContext = action.payload;
    },
    clearPendingFleetReceiveContext(state) {
      state.pendingFleetReceiveContext = null;
    },
    setPendingVariantSetupContext(
      state,
      action: PayloadAction<PendingVariantSetupContext | null>,
    ) {
      state.pendingVariantSetupContext = action.payload;
    },
    clearPendingVariantSetupContext(state) {
      state.pendingVariantSetupContext = null;
    },
    setRoutePage(
      state,
      action: PayloadAction<{ routeKey: string; page: number }>,
    ) {
      state.pageByRoute[action.payload.routeKey] = normalizePage(action.payload.page);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      workspaceApi.endpoints.getWorkspaceContext.matchFulfilled,
      (state, { payload }) => {
        const branches = payload.data.branches;
        if (
          branches.length > 0 &&
          (!state.selectedBranchId ||
            !branches.some((b) => b.id === state.selectedBranchId))
        ) {
          state.selectedBranchId = branches[0].id;
        }
      },
    );
    builder.addMatcher(
      workspaceApi.endpoints.createBranch.matchFulfilled,
      (state, { payload }) => {
        state.selectedBranchId = payload.data.branch.id;
      },
    );
  },
});

export const {
  setActiveSection,
  navigateToWorkspacePage,
  setSelectedBranchId,
  setCommandPaletteOpen,
  toggleIconRailPinned,
  setPendingFleetReceiveContext,
  clearPendingFleetReceiveContext,
  setPendingVariantSetupContext,
  clearPendingVariantSetupContext,
  setRoutePage,
  syncRouteFromUrl,
  clearPendingUrlPush,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
