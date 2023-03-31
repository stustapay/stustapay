import { BaseQueryApi } from "@reduxjs/toolkit/dist/query/baseQueryTypes";
import { RootState, selectAuthToken } from "@store";

export const baseUrl = "http://localhost:8081";
export const baseWebsocketUrl = "ws://localhost:8081";

export const prepareAuthHeaders = (
  headers: Headers,
  { getState }: Pick<BaseQueryApi, "getState" | "extra" | "endpoint" | "type" | "forced">
) => {
  const token = selectAuthToken(getState() as RootState);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
};
