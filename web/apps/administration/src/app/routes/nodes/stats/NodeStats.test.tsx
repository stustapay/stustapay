import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseCurrentUserHasPrivilege = jest.fn();
const mockDispatch = jest.fn();

jest.mock("@/hooks", () => ({
  useCurrentEventSettings: () => ({
    eventSettings: {
      start_date: "2026-01-01",
      end_date: "2026-01-07",
      daily_end_time: "06:00:00",
    },
  }),
  useCurrentNode: () => ({
    currentNode: {
      id: 5,
      event: {},
      event_node_id: 5,
      children: [],
    },
  }),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
}));

jest.mock("@/store", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: unknown) => {
    if (typeof selector !== "function") {
      return undefined;
    }
    return selector({
      ui: {
        statsPollingInterval: 0,
        statsExpandedSections: {
          filters: false,
          kpis: false,
          prediction: false,
          counterChart: false,
          productChart: false,
          quantityTable: false,
          counterTable: false,
          orders: true,
        },
      },
    });
  },
  selectStatsPollingInterval: (state: { ui: { statsPollingInterval: number } }) => state.ui.statsPollingInterval,
  selectStatsExpandedSections: (state: { ui: { statsExpandedSections: unknown } }) => state.ui.statsExpandedSections,
  setStatsPollingInterval: jest.fn(),
  setStatsSectionExpanded: jest.fn(),
}));

jest.mock("@/api", () => ({
  api: { util: { invalidateTags: jest.fn() } },
  useGetAvailableDatesQuery: () => ({ data: [] }),
  useListTillsQuery: () => ({ data: { ids: [], entities: {} } }),
  useListProductsQuery: () => ({ data: { ids: [], entities: {} } }),
  useGetRevenuePredictionQuery: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("./DashboardKPIs", () => ({
  DashboardKPIs: () => <div>kpis</div>,
}));

jest.mock("./RevenueByCounterChart", () => ({
  RevenueByCounterChart: () => <div>counter-chart</div>,
}));

jest.mock("./RevenueByProductChart", () => ({
  RevenueByProductChart: () => <div>product-chart</div>,
}));

jest.mock("./RevenueByCounterTable", () => ({
  RevenueByCounterTable: () => <div>counter-table</div>,
}));

jest.mock("./QuantitiesByProductTable", () => ({
  QuantitiesByProductTable: () => <div>quantities-table</div>,
}));

jest.mock("./OrdersTable", () => ({
  OrdersTable: () => <div data-testid="orders-table">orders-table</div>,
}));

jest.mock("./RevenuePredictionChart", () => ({
  RevenuePredictionChart: () => <div>prediction-chart</div>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { NodeStats } = require("./NodeStats");

describe("NodeStats", () => {
  beforeEach(() => {
    mockUseCurrentUserHasPrivilege.mockReset();
    mockDispatch.mockReset();
  });

  test("shows the orders section for stats viewers with can_book_orders", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return privilege.includes("can_book_orders");
      }
      return privilege === "view_node_stats" || privilege === "can_book_orders";
    });

    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <NodeStats />
      </MemoryRouter>
    );

    expect(screen.getByText("overview.orders")).toBeTruthy();
    expect(screen.getByTestId("orders-table")).toBeTruthy();
  });
});
