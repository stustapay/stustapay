import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseListOrdersFilteredQuery = jest.fn();
const mockUseListTillsQuery = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();

jest.mock("@/api", () => ({
  useListOrdersFilteredQuery: (...args: unknown[]) => mockUseListOrdersFilteredQuery(...args),
  useListTillsQuery: (...args: unknown[]) => mockUseListTillsQuery(...args),
  selectTillById: (data: { entities: Record<number, { name: string }> }, id: number) => data.entities[id],
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({ currentNode: { id: 5 } }),
  useCurrencyFormatter: () => (value?: number | null) => (value == null ? "-" : `EUR ${value.toFixed(2)}`),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
}));

jest.mock("@/app/routes", () => ({
  OrderRoutes: {
    privilege: "node_administration",
  },
}));

jest.mock("@/components/tables/TableFilterBar", () => ({
  TableFilterBar: () => <div data-testid="orders-table-filter-bar" />,
}));

jest.mock("@/components/tables/SortableTableHeader", () => {
  const ReactModule = require("react");
  const { TableCell } = require("@mui/material");

  return {
    SortableTableHeader: ({ label }: { label: string }) => <TableCell>{label}</TableCell>,
  };
});

jest.mock("@/hooks/useFilterableTable", () => ({
  useFilterableTable: ({ data }: { data: unknown[] }) => ({
    filteredData: data,
    searchQuery: "",
    setSearchQuery: jest.fn(),
    sortField: "orderDate",
    sortDirection: "desc",
    setSort: jest.fn(),
    columnFilters: {},
    setColumnFilter: jest.fn(),
    clearColumnFilter: jest.fn(),
    clearAllFilters: jest.fn(),
  }),
}));

jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "overview.showMore") {
        return `Show ${options?.count} more`;
      }
      return key;
    },
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { OrdersTable } = require("./OrdersTable");

const makeOrder = (id: number, tillId = 11) => ({
  id,
  order_type: "sale",
  booked_at: `2026-01-01T${String(id % 24).padStart(2, "0")}:00:00.000Z`,
  till_id: tillId,
  total_price: 5,
  line_items: [
    {
      product: {
        id: 1000 + id,
        name: `Product ${id}`,
      },
      quantity: 1,
      product_price: 5,
    },
  ],
});

const makeNormalizedOrders = (start: number, end: number, tillId = 11) => {
  const orders = Array.from({ length: end - start + 1 }, (_, index) => makeOrder(start + index, tillId));
  return {
    ids: orders.map((order) => order.id),
    entities: Object.fromEntries(orders.map((order) => [order.id, order])),
  };
};

describe("OrdersTable", () => {
  beforeEach(() => {
    mockUseListOrdersFilteredQuery.mockReset();
    mockUseListTillsQuery.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();

    mockUseListTillsQuery.mockReturnValue({
      data: {
        ids: [11],
        entities: {
          11: { id: 11, name: "Main Till" },
        },
      },
    });
  });

  test("does not query or render orders when the user lacks order permissions", async () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);
    mockUseListOrdersFilteredQuery.mockReturnValue({
      data: makeNormalizedOrders(1, 1),
      isLoading: false,
      fulfilledTimeStamp: 1,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable />
      </MemoryRouter>
    );

    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 }),
      expect.objectContaining({ skip: true })
    );
    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
    expect(screen.queryByText("1")).toBeNull();
  });

  test("skips querying when the orders section is collapsed", () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(true);
    mockUseListOrdersFilteredQuery.mockReturnValue({
      data: makeNormalizedOrders(1, 1),
      isLoading: false,
      fulfilledTimeStamp: 1,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable enabled={false} />
      </MemoryRouter>
    );

    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 }),
      expect.objectContaining({ skip: true })
    );
    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
  });

  test("can transition from expanded to collapsed without throwing", async () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(true);
    mockUseListOrdersFilteredQuery.mockReturnValue({
      data: makeNormalizedOrders(1, 2),
      isLoading: false,
      fulfilledTimeStamp: 1,
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable enabled={true} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: "1" })).toBeTruthy();

    rerender(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable enabled={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
  });

  test("loads orders in 50-item pages and resets to the first page when filters change", async () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(true);
    mockUseListOrdersFilteredQuery.mockImplementation(
      (queryArg: { offset?: number | null; tillId?: number | null; selectedDates?: string[] | null }) => {
        if (queryArg.selectedDates?.join(",") === "2026-01-03,2026-01-05") {
          return {
            data: makeNormalizedOrders(401, 401, 11),
            isLoading: false,
            fulfilledTimeStamp: 8000,
          };
        }

        if (queryArg.tillId === 7) {
          return {
            data: makeNormalizedOrders(301, 301, 7),
            isLoading: false,
            fulfilledTimeStamp: 7000,
          };
        }

        if ((queryArg.offset ?? 0) === 50) {
          return {
            data: makeNormalizedOrders(51, 100),
            isLoading: false,
            fulfilledTimeStamp: 1050,
          };
        }

        return {
          data: makeNormalizedOrders(1, 50),
          isLoading: false,
          fulfilledTimeStamp: 1000,
        };
      }
    );

    const { rerender } = render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable />
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: "1" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "51" })).toBeNull();
    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 }),
      expect.any(Object)
    );

    fireEvent.click(screen.getByRole("button", { name: "Show 50 more" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "51" })).toBeTruthy();
    });
    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 50 }),
      expect.any(Object)
    );

    rerender(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable tillId={7} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "301" })).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: "51" })).toBeNull();
    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0, tillId: 7 }),
      expect.any(Object)
    );

    rerender(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <OrdersTable selectedDates={["2026-01-03", "2026-01-05"]} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "401" })).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: "301" })).toBeNull();
    expect(mockUseListOrdersFilteredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0, selectedDates: ["2026-01-03", "2026-01-05"] }),
      expect.any(Object)
    );
  });
});
