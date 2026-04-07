import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { api } from "@/api";

export interface AuthState {
  token: string | null;
  portalNodeId: number | null;
}

export const initialAuthState: AuthState = {
  token: null,
  portalNodeId: null,
};

export const shouldResetPersistedPortalAuth = (
  token: string | null,
  portalNodeId: number | null,
  currentPortalNodeId: number
) => token !== null && portalNodeId !== currentPortalNodeId;

export const migrateAuthState = (state?: Partial<AuthState> | null): AuthState => {
  if (!state?.token || typeof state.portalNodeId !== "number") {
    return initialAuthState;
  }

  return {
    token: state.token,
    portalNodeId: state.portalNodeId,
  };
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setAuthenticatedSession: (state, action: { payload: AuthState }) => {
      state.token = action.payload.token;
      state.portalNodeId = action.payload.portalNodeId;
    },
    forceLogout: (state) => {
      state.token = null;
      state.portalNodeId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(api.endpoints.logout.matchFulfilled, (state) => {
      state.token = null;
      state.portalNodeId = null;
    });
    builder.addMatcher(api.endpoints.logout.matchRejected, (state) => {
      state.token = null;
      state.portalNodeId = null;
    });
  },
});

export const { forceLogout, setAuthenticatedSession } = authSlice.actions;

export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectAuthPortalNodeId = (state: RootState) => state.auth.portalNodeId;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.token !== null && state.auth.portalNodeId !== null;
