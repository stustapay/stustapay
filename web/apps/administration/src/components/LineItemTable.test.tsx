import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseListProductsQuery = jest.fn();
const mockUseListTaxRatesQuery = jest.fn();

jest.mock("@/api", () => ({
  useListProductsQuery: (...args: unknown[]) => mockUseListProductsQuery(...args),
  useListTaxRatesQuery: (...args: unknown[]) => mockUseListTaxRatesQuery(...args),
  selectProductById: (data: { entities: Record<number, unknown> }, id: number) => data.entities[id],
  selectTaxRateById: (data: { entities: Record<number, unknown> }, id: number) => data.entities[id],
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({ currentNode: { id: 5 } }),
}));

jest.mock("@/app/routes", () => ({
  ProductRoutes: {
    detail: (id: number) => `/node/5/products/${id}`,
  },
}));

jest.mock("@stustapay/framework", () => ({
  DataGrid: ({
    rows,
    columns,
  }: {
    rows: Record<string, unknown>[];
    columns: Array<{ field: string; renderCell?: (params: { row: Record<string, unknown> }) => React.ReactNode }>;
  }) => (
    <table>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td key={column.field}>{column.renderCell ? column.renderCell({ row }) : row[column.field]}</td>
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

jest.mock("@mui/material", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { LineItemTable } = require("./LineItemTable");

describe("LineItemTable", () => {
  beforeEach(() => {
    mockUseListProductsQuery.mockReset();
    mockUseListTaxRatesQuery.mockReset();

    mockUseListProductsQuery.mockReturnValue({
      data: { ids: [], entities: {} },
      isLoading: false,
    });
    mockUseListTaxRatesQuery.mockReturnValue({
      data: { ids: [7], entities: { 7: { id: 7, description: "Full tax" } } },
      isLoading: false,
    });
  });

  test("renders embedded product names when the product is not available at the current node", () => {
    render(
      <MemoryRouter initialEntries={["/node/5/orders/42"]}>
        <LineItemTable
          lineItems={[
            {
              item_id: 1,
              quantity: 2,
              product: {
                id: 42,
                name: "Imported Beer",
                price: 3.5,
                fixed_price: true,
                price_in_vouchers: null,
                restrictions: [],
                is_returnable: false,
                tax_rate_id: 7,
                tax_rate: 0.19,
              },
              product_price: 3.5,
              total_price: 7,
              tax_name: "full",
              tax_rate: 0.19,
              tax_rate_id: 7,
              total_tax: 1.12,
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Imported Beer")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Imported Beer" })).toBeNull();
  });
});
