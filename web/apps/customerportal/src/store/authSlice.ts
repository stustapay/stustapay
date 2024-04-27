import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { api } from "@/api";

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    forceLogout: (state) => {
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(api.endpoints.login.matchFulfilled, (state, action) => {
      const { access_token } = action.payload;
      state.token = access_token;
    });
    builder.addMatcher(api.endpoints.logout.matchFulfilled, (state) => {
      state.token = null;
    });
    builder.addMatcher(api.endpoints.logout.matchRejected, (state) => {
      state.token = null;
    });
  },
});

export const { forceLogout } = authSlice.actions;

export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.token !== null;
