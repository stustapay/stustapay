import { createApi } from "@reduxjs/toolkit/query/react";
import { adminApiBaseQuery } from "./common";
import { createEntityAdapter, EntityState } from "@reduxjs/toolkit";
import { convertEntityAdaptorSelectors } from "./utils";
import { NewTillRegister, TillRegister } from "@stustapay/models";

const tillRegisterAdapter = createEntityAdapter<TillRegister>({
  sortComparer: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
});

export const tillRegisterApi = createApi({
  reducerPath: "tillRegisterApi",
  baseQuery: adminApiBaseQuery,
  tagTypes: ["till-register"],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getTillRegisters: builder.query<EntityState<TillRegister>, void>({
      query: () => "/till-registers",
      transformResponse: (response: TillRegister[]) => {
        return tillRegisterAdapter.addMany(tillRegisterAdapter.getInitialState(), response);
      },
      providesTags: (result, error, arg) =>
        result
          ? [...result.ids.map((id) => ({ type: "till-register" as const, id })), "till-register"]
          : ["till-register"],
    }),
    createTillRegister: builder.mutation<TillRegister, NewTillRegister>({
      query: (till) => ({ url: "/till-registers", method: "POST", body: till }),
      invalidatesTags: ["till-register"],
    }),
    updateTillRegister: builder.mutation<TillRegister, TillRegister>({
      query: ({ id, ...till }) => ({ url: `/till-registers/${id}`, method: "POST", body: till }),
      invalidatesTags: ["till-register"],
    }),
    deleteTillRegister: builder.mutation<void, number>({
      query: (id) => ({ url: `/till-registers/${id}`, method: "DELETE" }),
      invalidatesTags: ["till-register"],
    }),
    transferRegister: builder.mutation<void, { source_cashier_id: number; target_cashier_id: number }>({
      query: (payload) => ({
        url: `/till-registers/transfer-register`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["till-register"],
    }),
  }),
});

export const {
  selectTillRegisterAll,
  selectTillRegisterById,
  selectTillRegisterEntities,
  selectTillRegisterIds,
  selectTillRegisterTotal,
} = convertEntityAdaptorSelectors("TillRegister", tillRegisterAdapter.getSelectors());

export const {
  useCreateTillRegisterMutation,
  useGetTillRegistersQuery,
  useUpdateTillRegisterMutation,
  useDeleteTillRegisterMutation,
  useTransferRegisterMutation,
} = tillRegisterApi;
