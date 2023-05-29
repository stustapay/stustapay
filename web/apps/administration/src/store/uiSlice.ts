import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export type Theme = "light" | "dark" | "browser";

interface UiState {
  theme: Theme;
}

const initialState: UiState = {
  theme: "browser",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState: initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = uiSlice.actions;

export const selectTheme = (state: RootState) => state.ui.theme;
