import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NewTillLayout, TillLayout, TillButton, NewTillButton, UpdateTillButton } from "@models/till";
import { baseUrl, prepareAuthHeaders } from "./common";

export const tillLayoutApi = createApi({
  reducerPath: "tillLayoutApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["till-buttons", "till-layouts"],
  endpoints: (builder) => ({
    getTillButtonById: builder.query<TillButton, number>({
      query: (id) => `/till-buttons/${id}/`,
      providesTags: (result, error, arg) => ["till-buttons", { type: "till-buttons" as const, id: arg }],
    }),
    getTillButtons: builder.query<TillButton[], void>({
      query: () => "/till-buttons/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "till-buttons" as const, id })), "till-buttons"]
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
    getTillLayoutById: builder.query<TillLayout, number>({
      query: (id) => `/till-layouts/${id}/`,
      providesTags: (result, error, arg) => ["till-layouts", { type: "till-layouts" as const, id: arg }],
    }),
    getTillLayouts: builder.query<TillLayout[], void>({
      query: () => "/till-layouts/",
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: "till-layouts" as const, id })), "till-layouts"]
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
