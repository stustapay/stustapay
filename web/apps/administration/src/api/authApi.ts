import { createApi } from "@reduxjs/toolkit/query/react";
import { CurrentUser } from "@stustapay/models";
import { adminApiBaseQuery } from "./common";

export interface UserResponse {
  user: CurrentUser;
  access_token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: adminApiBaseQuery,
  endpoints: (builder) => ({
    login: builder.mutation<UserResponse, LoginRequest>({
      query: (credentials) => {
        const formData = new FormData();
        formData.append("username", credentials.username);
        formData.append("password", credentials.password);
        return {
          url: "/auth/login/",
          method: "POST",
          body: formData,
        };
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout/",
        method: "POST",
      }),
    }),
    changePassword: builder.mutation<void, { oldPassword: string; newPassword: string }>({
      query: (payload) => ({
        url: "/auth/change-password/",
        method: "POST",
        body: { new_password: payload.newPassword, old_password: payload.oldPassword },
      }),
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useChangePasswordMutation } = authApi;
