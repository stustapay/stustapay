import * as React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/hooks", () => ({
  useCurrencyFormatter: () => (value?: number | null) => (value == null ? "-" : `EUR ${value.toFixed(2)}`),
}));

jest.mock("@/components/tables/TableFilterBar", () => ({
  TableFilterBar: () => <div data-testid="filter-bar" />,
}));

jest.mock("@/components/tables/SortableTableHeader", () => {
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
    sortField: "revenue",
    sortDirection: "desc",
    setSort: jest.fn(),
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
    t: (key: string, options?: Record<string, unknown>) =>
      key === "overview.selectedDatesCount" ? `selected:${options?.count}` : key,
  }),
}));

const { RevenueByCounterTable } = require("./RevenueByCounterTable");

describe("RevenueByCounterTable", () => {
  test("renders from injected shared counter stats", () => {
    render(
      <RevenueByCounterTable
        enabled={true}
        selectedDates={["2026-01-03", "2026-01-04"]}
        data={{
          counters: [
            { till_id: 1, till_name: "North", revenue: 10, order_count: 2 },
            { till_id: 2, till_name: "South", revenue: 5, order_count: 1 },
          ],
          total_revenue: 15,
        }}
      />
    );

    expect(screen.getByTestId("filter-bar")).toBeTruthy();
    expect(screen.getByText("North")).toBeTruthy();
    expect(screen.getByText("South")).toBeTruthy();
    expect(screen.getAllByText("EUR 10.00").length).toBeGreaterThan(0);
    expect(screen.getByText("selected:2")).toBeTruthy();
  });
});
