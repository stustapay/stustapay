import { createApi } from "@reduxjs/toolkit/query/react";
import { customerApiBaseQuery } from "./common";

export interface UserResponse {
  access_token: string;
}

export interface LoginRequest {
  userTagUid: string;
  userTagPin: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: customerApiBaseQuery,
  endpoints: (builder) => ({
    login: builder.mutation<UserResponse, LoginRequest>({
      query: (credentials) => {
        const formData = new FormData();
        formData.append("user_tag_uid", credentials.userTagUid);
        formData.append("user_tag_pin", credentials.userTagPin);
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
  }),
});

export const { useLoginMutation, useLogoutMutation } = authApi;
