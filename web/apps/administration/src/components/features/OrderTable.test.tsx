import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseListUsersQuery = jest.fn();
const mockUseListTillsQuery = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();

jest.mock("@/api", () => ({
  useListUsersQuery: (...args: unknown[]) => mockUseListUsersQuery(...args),
  useListTillsQuery: (...args: unknown[]) => mockUseListTillsQuery(...args),
  selectUserById: (data: { entities: Record<number, { display_name: string }> }, id: number) => data.entities[id],
  selectTillById: (data: { entities: Record<number, { name: string }> }, id: number) => data.entities[id],
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({ currentNode: { id: 5 } }),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
}));

jest.mock("@/app/routes", () => ({
  OrderRoutes: {
    privilege: "node_administration",
    detail: (id: number) => `/node/5/orders/${id}`,
  },
  CashierRoutes: {
    detail: (id: number) => `/node/5/cashiers/${id}`,
  },
  TillRoutes: {
    detail: (id: number) => `/node/5/tills/${id}`,
  },
}));

jest.mock("@stustapay/framework", () => ({
  DataGrid: ({ rows, columns }: { rows: Record<string, unknown>[]; columns: Array<Record<string, unknown>> }) => (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.id)}>
            {columns.map((column) => (
              <td key={String(column.field)}>
                {column.renderCell
                  ? column.renderCell({ row })
                  : row[String(column.field)]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  DataGridTitle: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/models", () => ({
  getUserName: (user: { display_name: string }) => user.display_name,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { OrderTable } = require("./OrderTable");

describe("OrderTable", () => {
  beforeEach(() => {
    mockUseListUsersQuery.mockReset();
    mockUseListTillsQuery.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();

    mockUseListUsersQuery.mockReturnValue({
      data: { ids: [], entities: {} },
    });
    mockUseListTillsQuery.mockReturnValue({
      data: { ids: [], entities: {} },
    });
  });

  test("renders plain order ids when the user lacks order permissions", () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/node/5/customers/1"]}>
        <OrderTable
          orders={[
            {
              id: 42,
              order_type: "sale",
              payment_method: "tag",
              total_no_tax: 4,
              total_tax: 1,
              total_price: 5,
              booked_at: "2026-01-01T12:00:00.000Z",
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "42" })).toBeNull();
  });
});
