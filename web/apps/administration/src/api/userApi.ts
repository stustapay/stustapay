import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { User, NewUser } from "../models/users";
import { baseUrl, prepareAuthHeaders } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const userAdapter = createEntityAdapter<User>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["user"],
  endpoints: (builder) => ({
    getUserById: builder.query<EntityState<User>, number>({
      query: (id) => `/users/${id}/`,
      transformResponse: (response: User) => {
        return userAdapter.addOne(userAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["user", { type: "user" as const, id: arg }],
    }),
    getUsers: builder.query<EntityState<User>, void>({
      query: () => "/users/",
      transformResponse: (response: User[]) => {
        return userAdapter.addMany(userAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "user" as const, id })), "user"] : ["user"],
    }),
    createUser: builder.mutation<User, NewUser>({
      query: (user) => ({ url: "/users/", method: "POST", body: user }),
      invalidatesTags: ["user"],
    }),
    updateUser: builder.mutation<User, User>({
      query: ({ id, ...user }) => ({ url: `/users/${id}/`, method: "POST", body: user }),
      invalidatesTags: (result, error, { id }) => [{ type: "user", id }],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({ url: `/users/${id}/`, method: "DELETE" }),
      invalidatesTags: ["user"],
    }),
  }),
});

export const { selectUserAll, selectUserById, selectUserEntities, selectUserIds, selectUserTotal } =
  convertEntityAdaptorSelectors("User", userAdapter.getSelectors());

export const {
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUserByIdQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
} = userApi;
