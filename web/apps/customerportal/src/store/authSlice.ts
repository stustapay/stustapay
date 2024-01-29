import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { authApi } from "@/api/authApi";

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
    builder.addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
      const { access_token } = action.payload;
      state.token = access_token;
    });
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.token = null;
    });
    builder.addMatcher(authApi.endpoints.logout.matchRejected, (state) => {
      state.token = null;
    });
  },
});

export const { forceLogout } = authSlice.actions;

export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.token !== null;
