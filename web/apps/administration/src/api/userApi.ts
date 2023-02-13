import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { User, NewUser } from "../models/users";
import { baseUrl, prepareAuthHeaders } from "./common";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["user"],
  endpoints: (builder) => ({
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}/`,
      providesTags: (result, error, arg) => ["user", { type: "user" as const, id: arg }],
    }),
    getUsers: builder.query<User[], void>({
      query: () => "/users/",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "user" as const, id })), "user"] : ["user"],
    }),
    createUser: builder.mutation<User, NewUser>({
      query: (user) => ({ url: "/users/", method: "POST", body: user }),
      invalidatesTags: ["user"],
    }),
    updateUser: builder.mutation<User, User>({
      query: ({ id, ...user }) => ({ url: `/users/${id}/`, method: "POST", body: user }),
      invalidatesTags: ["user"],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({ url: `/users/${id}/`, method: "DELETE" }),
      invalidatesTags: ["user"],
    }),
  }),
});

export const {
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUserByIdQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
} = userApi;
