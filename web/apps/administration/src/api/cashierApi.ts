import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Cashier } from "../models/cashier";

const cashiers: Record<number, Cashier> = {
  0: {
    id: 0,
    name: "Kassier 10",
  },
  1: {
    id: 1,
    name: "Kassier 2",
  },
  2: {
    id: 2,
    name: "Kassier 1",
  },
  3: {
    id: 3,
    name: "Kassier 5",
  },
};

export const cashierApi = createApi({
  reducerPath: "cashiers",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8080/api/v1" }),
  tagTypes: ["cashier"],
  endpoints: (builder) => ({
    getCashierById: builder.query<Cashier, number>({
      // query: (id) => `cashiers/${id}`,
      providesTags: (result, error, arg) => ["cashier", { type: "cashier" as const, id: arg }],
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        if (cashiers[arg]) {
          return { data: cashiers[arg] };
        }
        return {
          error: {
            status: 404,
            statusText: "not found",
            data: "not found",
          },
        };
      },
    }),
    getCashiers: builder.query<Cashier[], void>({
      // query: () => "cashiers",
      providesTags: (result, error, arg) =>
        result ? [...result.map(({ id }) => ({ type: "cashier" as const, id })), "cashier"] : ["cashier"],
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        return { data: Object.values(cashiers) };
      },
    }),
    addCashier: builder.mutation<Cashier, Omit<Cashier, "id">>({
      invalidatesTags: ["cashier"],
      queryFn: (body) => {
        const newCashier: Cashier = {
          ...body,
          id: Number(Math.max(...Object.keys(cashiers).map((id) => Number(id)))) + 1,
        };
        cashiers[newCashier.id] = newCashier;
        return { data: newCashier };
      },
    }),
    updateCashier: builder.mutation<Cashier, Partial<Cashier> & Pick<Cashier, "id">>({
      invalidatesTags: ["cashier"],
      queryFn: (body) => {
        if (!cashiers[body.id]) {
          return {
            error: {
              status: 404,
              statusText: "not found",
              data: "not found",
            },
          };
        }
        const newCashier: Cashier = {
          ...cashiers[body.id],
          ...body,
        };
        cashiers[body.id] = newCashier;
        return { data: newCashier };
      },
    }),
  }),
});

export const { useGetCashierByIdQuery, useGetCashiersQuery, useAddCashierMutation, useUpdateCashierMutation } =
  cashierApi;
