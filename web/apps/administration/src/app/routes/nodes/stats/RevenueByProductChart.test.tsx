import * as React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/hooks", () => ({
  useCurrencyFormatter: () => (value?: number | null) => (value == null ? "-" : `EUR ${value.toFixed(2)}`),
}));

jest.mock("@/components", () => ({
  BarChart: ({ data }: { data: Array<{ id: string; value: number }> }) => (
    <div data-testid="bar-chart">{data.map((item) => `${item.id}:${item.value}`).join("|")}</div>
  ),
}));

jest.mock("@/components/common/FilterBadge", () => ({
  FilterBadge: ({ value }: { value: string }) => <div data-testid="filter-badge">{value}</div>,
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
    t: (key: string) => key,
  }),
}));

const { RevenueByProductChart } = require("./RevenueByProductChart");

describe("RevenueByProductChart", () => {
  test("renders from injected shared product stats", () => {
    render(
      <RevenueByProductChart
        enabled={true}
        data={{
          product_overall_stats: [{ product_id: 2, product_name: "Water", count: 4, revenue: 12.5 }],
          deposit_overall_stats: [{ product_id: 3, product_name: "Cup", count: 1, revenue: -2 }],
        }}
        productId={2}
      />
    );

    expect(screen.getByTestId("bar-chart").textContent).toContain("Water:12.5|Cup:-2");
  });
});
