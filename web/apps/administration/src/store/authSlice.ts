import { api, CurrentUser } from "@/api";
import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface AuthState {
  user: CurrentUser | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    forceLogout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(api.endpoints.login.matchFulfilled, (state, action) => {
      if (action.payload.success) {
        const { user, token } = action.payload.success;
        state.user = user;
        state.token = token;
      }
    });
    builder.addMatcher(api.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.token = null;
    });
    builder.addMatcher(api.endpoints.logout.matchRejected, (state) => {
      state.user = null;
      state.token = null;
    });
  },
});

export const { forceLogout } = authSlice.actions;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => selectCurrentUser(state) !== null;
