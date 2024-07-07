import { AuthProvider } from "react-admin";
import { loginSuccess, forceLogout, store } from "../store";
import { UserLoginResult } from "@/api";
import { fetchUtils } from "react-admin";
import { adminApiBaseUrl } from "./common";

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const resp = await fetchUtils.fetchJson(`${adminApiBaseUrl}/auth/login`, {
      body: JSON.stringify({ username, password }),
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
    });

    const decoded = resp.json as UserLoginResult;
    store.dispatch(loginSuccess({ user: decoded.success!.user, token: decoded.success!.token }));
  },
  logout: async () => {
    const token = store.getState().auth.token;
    if (!token) {
      return;
    }
    await fetchUtils.fetchJson(`${adminApiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    });
    store.dispatch(forceLogout());
    return Promise.resolve();
  },
  // called when the API returns an error
  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      store.dispatch(forceLogout());

      return Promise.reject();
    }
    return Promise.resolve();
  },
  // called when the user navigates to a new location, to check for authentication
  checkAuth: () => {
    const isAuthenticated = store.getState().auth.token != null;
    console.log("checkAuth: isAuthenticated = ", isAuthenticated);
    return isAuthenticated ? Promise.resolve() : Promise.reject();
  },
  getIdentity: async () => {
    const user = store.getState().auth.user;
    if (user) {
      return user;
    }
    throw new Error("unauthorized");
  },
  // called when the user navigates to a new location, to check for permissions / roles
  getPermissions: () => Promise.resolve(),
};
