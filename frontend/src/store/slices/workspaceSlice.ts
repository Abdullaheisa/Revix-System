import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { workspaceApi } from "../api/workspaceApi";

export type WorkspaceSectionId =
  | "overview"
  | "sales"
  | "fleet"
  | "operations"
  | "finance"
  | "network"
  | "team"
  | "settings";

export interface WorkspaceUiState {
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  selectedBranchId: string | null;
  isCommandPaletteOpen: boolean;
  isIconRailPinned: boolean;
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
};

export const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setActiveSection(state, action: PayloadAction<WorkspaceSectionId>) {
      state.activeSection = action.payload;
      state.activeSubPage = DEFAULT_SUBPAGE_BY_SECTION[action.payload];
    },
    navigateToWorkspacePage(
      state,
      action: PayloadAction<{ section: WorkspaceSectionId; subPage: string }>,
    ) {
      state.activeSection = action.payload.section;
      state.activeSubPage = action.payload.subPage;
      state.isCommandPaletteOpen = false;
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
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
