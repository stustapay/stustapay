import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Till, NewTill, UpdateTill } from "@models/till";
import { baseUrl, prepareAuthHeaders } from "./common";

export const tillApi = createApi({
  reducerPath: "tillApi",
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl, prepareHeaders: prepareAuthHeaders }),
  tagTypes: ["tills"],
  endpoints: (builder) => ({
    getTillById: builder.query<Till, number>({
      query: (id) => `/tills/${id}/`,
      providesTags: (result, error, arg) => ["tills", { type: "tills" as const, id: arg }],
    }),
    getTills: builder.query<Till[], void>({
      query: () => "/tills/",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "tills" as const, id })), "tills"] : ["tills"],
    }),
    createTill: builder.mutation<Till, NewTill>({
      query: (till) => ({ url: "/tills/", method: "POST", body: till }),
      invalidatesTags: ["tills"],
    }),
    updateTill: builder.mutation<Till, UpdateTill>({
      query: ({ id, ...till }) => ({ url: `/tills/${id}/`, method: "POST", body: till }),
      invalidatesTags: ["tills"],
    }),
    logoutTill: builder.mutation<void, number>({
      query: (id) => ({ url: `/tills/${id}/logout/`, method: "POST" }),
      invalidatesTags: (result, error, arg) => [{ type: "tills", id: arg }],
    }),
    deleteTill: builder.mutation<void, number>({
      query: (id) => ({ url: `/tills/${id}/`, method: "DELETE" }),
      invalidatesTags: ["tills"],
    }),
  }),
});

export const {
  useCreateTillMutation,
  useDeleteTillMutation,
  useGetTillByIdQuery,
  useGetTillsQuery,
  useUpdateTillMutation,
  useLogoutTillMutation,
} = tillApi;
