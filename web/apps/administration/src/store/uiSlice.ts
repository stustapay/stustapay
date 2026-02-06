import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export type Theme = "light" | "dark" | "browser";

interface UiState {
  theme: Theme;
  expandedNodes: string[];
  selectedNode: string | null;
  statsPollingIntervalMs: number;
  statsExpandedSections: Record<string, boolean>;
}

const defaultStatsExpandedSections: Record<string, boolean> = {
  filters: true,
  kpis: true,
  prediction: true,
  counterChart: true,
  productChart: true,
  quantityTable: true,
  counterTable: true,
  orders: true,
};

const initialState: UiState = {
  theme: "browser",
  expandedNodes: [],
  selectedNode: null,
  statsPollingIntervalMs: 0,
  statsExpandedSections: defaultStatsExpandedSections,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState: initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setExpandedNodes: (state, action: PayloadAction<string[]>) => {
      state.expandedNodes = action.payload;
    },
    extendExpandedNodes: (state, action: PayloadAction<string[]>) => {
      for (const node of action.payload) {
        if (!state.expandedNodes.includes(node)) {
          state.expandedNodes.push(node);
        }
      }
    },
    setSelectedNodes: (state, action: PayloadAction<string | null>) => {
      state.selectedNode = action.payload;
    },
    setStatsPollingInterval: (state, action: PayloadAction<number>) => {
      state.statsPollingIntervalMs = action.payload;
    },
    setStatsSectionExpanded: (state, action: PayloadAction<{ section: string; expanded: boolean }>) => {
      state.statsExpandedSections = {
        ...(state.statsExpandedSections ?? defaultStatsExpandedSections),
        [action.payload.section]: action.payload.expanded,
      };
    },
  },
});

export const { setTheme, setExpandedNodes, setSelectedNodes, extendExpandedNodes, setStatsPollingInterval, setStatsSectionExpanded } =
  uiSlice.actions;

export const selectTheme = (state: RootState) => state.ui.theme;
export const selectExpandedNodes = (state: RootState) => state.ui.expandedNodes;
export const selectSelectedNodes = (state: RootState) => state.ui.selectedNode;
export const selectStatsPollingInterval = (state: RootState) => state.ui.statsPollingIntervalMs;
export const selectStatsExpandedSections = (state: RootState) => state.ui.statsExpandedSections ?? defaultStatsExpandedSections;
