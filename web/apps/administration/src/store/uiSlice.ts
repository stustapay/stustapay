import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export type Theme = "light" | "dark" | "browser";

interface UiState {
  theme: Theme;
  expandedNodes: string[];
  selectedNode: string | null;
}

const initialState: UiState = {
  theme: "browser",
  expandedNodes: [],
  selectedNode: null,
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
  },
});

export const { setTheme, setExpandedNodes, setSelectedNodes, extendExpandedNodes } = uiSlice.actions;

export const selectTheme = (state: RootState) => state.ui.theme;
export const selectExpandedNodes = (state: RootState) => state.ui.expandedNodes;
export const selectSelectedNodes = (state: RootState) => state.ui.selectedNode;
