import { createApi } from "@reduxjs/toolkit/query/react";
import { NewTillLayout, TillLayout, TillButton, NewTillButton, UpdateTillButton } from "@stustapay/models";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";

const tillLayoutAdapter = createEntityAdapter<TillLayout>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});
const tillButtonAdapter = createEntityAdapter<TillButton>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const tillLayoutApi = createApi({
  reducerPath: "tillLayoutApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["till-buttons", "till-layouts"],
  endpoints: (builder) => ({
    getTillButtonById: builder.query<EntityState<TillButton>, number>({
      query: (id) => `/till-buttons/${id}/`,
      transformResponse: (response: TillButton) => {
        return tillButtonAdapter.addOne(tillButtonAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["till-buttons", { type: "till-buttons" as const, id: arg }],
    }),
    getTillButtons: builder.query<EntityState<TillButton>, void>({
      query: () => "/till-buttons/",
      transformResponse: (response: TillButton[]) => {
        return tillButtonAdapter.addMany(tillButtonAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result
          ? [...result.ids.map((id) => ({ type: "till-buttons" as const, id })), "till-buttons"]
          : ["till-buttons"],
    }),
    createTillButton: builder.mutation<TillButton, NewTillButton>({
      query: (till) => ({ url: "/till-buttons/", method: "POST", body: till }),
      invalidatesTags: ["till-buttons"],
    }),
    updateTillButton: builder.mutation<TillButton, UpdateTillButton>({
      query: ({ id, ...layout }) => ({ url: `/till-buttons/${id}/`, method: "POST", body: layout }),
      invalidatesTags: ["till-buttons"],
    }),
    deleteTillButton: builder.mutation<void, number>({
      query: (id) => ({ url: `/till-buttons/${id}/`, method: "DELETE" }),
      invalidatesTags: ["till-buttons"],
    }),
    getTillLayoutById: builder.query<EntityState<TillLayout>, number>({
      query: (id) => `/till-layouts/${id}/`,
      transformResponse: (response: TillLayout) => {
        return tillLayoutAdapter.addOne(tillLayoutAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) => ["till-layouts", { type: "till-layouts" as const, id: arg }],
    }),
    getTillLayouts: builder.query<EntityState<TillLayout>, void>({
      query: () => "/till-layouts/",
      transformResponse: (response: TillLayout[]) => {
        return tillLayoutAdapter.addMany(tillLayoutAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result
          ? [...result.ids.map((id) => ({ type: "till-layouts" as const, id })), "till-layouts"]
          : ["till-layouts"],
    }),
    createTillLayout: builder.mutation<TillLayout, NewTillLayout>({
      query: (till) => ({ url: "/till-layouts/", method: "POST", body: till }),
      invalidatesTags: ["till-layouts"],
    }),
    updateTillLayout: builder.mutation<TillLayout, TillLayout>({
      query: ({ id, ...layout }) => ({ url: `/till-layouts/${id}/`, method: "POST", body: layout }),
      invalidatesTags: ["till-layouts"],
    }),
    deleteTillLayout: builder.mutation<void, number>({
      query: (id) => ({ url: `/till-layouts/${id}/`, method: "DELETE" }),
      invalidatesTags: ["till-layouts"],
    }),
  }),
});

export const {
  selectTillLayoutAll,
  selectTillLayoutById,
  selectTillLayoutEntities,
  selectTillLayoutIds,
  selectTillLayoutTotal,
} = convertEntityAdaptorSelectors("TillLayout", tillLayoutAdapter.getSelectors());

export const {
  selectTillButtonAll,
  selectTillButtonById,
  selectTillButtonEntities,
  selectTillButtonIds,
  selectTillButtonTotal,
} = convertEntityAdaptorSelectors("TillButton", tillButtonAdapter.getSelectors());

export const {
  useCreateTillLayoutMutation,
  useDeleteTillLayoutMutation,
  useGetTillLayoutByIdQuery,
  useGetTillLayoutsQuery,
  useUpdateTillLayoutMutation,
  useCreateTillButtonMutation,
  useDeleteTillButtonMutation,
  useGetTillButtonByIdQuery,
  useGetTillButtonsQuery,
  useUpdateTillButtonMutation,
} = tillLayoutApi;
