import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewUser, NewUserRole, Privilege, User, UserRole } from "@stustapay/models";

const userAdapter = createEntityAdapter<User>({
  sortComparer: (a, b) => a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
});

const userRoleAdapter = createEntityAdapter<UserRole>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["user", "userRole"],
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
    getUserRoles: builder.query<EntityState<UserRole>, void>({
      query: () => "/user_roles/",
      transformResponse: (response: UserRole[]) => {
        return userRoleAdapter.addMany(userRoleAdapter.getInitialState(), response);
      },
      providesTags: (result) =>
        result ? [...result.ids.map((id) => ({ type: "userRole" as const, id })), "userRole"] : ["userRole"],
    }),
    createUserRole: builder.mutation<UserRole, NewUserRole>({
      query: (userRole) => ({ url: "/user_roles/", method: "POST", body: userRole }),
      invalidatesTags: ["userRole"],
    }),
    updateUserRole: builder.mutation<UserRole, { id: number; privileges: Privilege[] }>({
      query: ({ id, ...role }) => ({ url: `/user_roles/${id}/`, method: "POST", body: role }),
      invalidatesTags: (result, error, { id }) => [{ type: "userRole", id }],
    }),
    deleteUserRole: builder.mutation<void, number>({
      query: (id) => ({ url: `/user_roles/${id}/`, method: "DELETE" }),
      invalidatesTags: ["userRole"],
    }),
  }),
});

export const { selectUserAll, selectUserById, selectUserEntities, selectUserIds, selectUserTotal } =
  convertEntityAdaptorSelectors("User", userAdapter.getSelectors());

export const { selectUserRoleAll, selectUserRoleById, selectUserRoleEntities, selectUserRoleIds, selectUserRoleTotal } =
  convertEntityAdaptorSelectors("UserRole", userRoleAdapter.getSelectors());

export const {
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUserByIdQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useCreateUserRoleMutation,
  useDeleteUserRoleMutation,
  useGetUserRolesQuery,
  useUpdateUserRoleMutation,
} = userApi;
