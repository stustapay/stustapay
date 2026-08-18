import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";
import { DateTime } from "luxon";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseCurrentUserHasPrivilege = jest.fn();
const mockDispatch = jest.fn();
const mockUseGetAvailableDatesQuery = jest.fn();
const mockUseListTillsQuery = jest.fn();
const mockUseListProductsQuery = jest.fn();
const mockUseGetRevenuePredictionQuery = jest.fn();
const mockUseGetDashboardOverviewQuery = jest.fn();
const mockUseGetPaymentMethodStatsQuery = jest.fn();
const mockUseGetProductStatsQuery = jest.fn();
const mockUseGetRevenueByCounterQuery = jest.fn();
const mockInvalidateTags = jest.fn();

let mockUiState = {
  statsPollingIntervalMs: 0,
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
};

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

const mockUiStateWrapper = {
  get ui() {
    return mockUiState;
  },
};

jest.mock("@/store", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockUiStateWrapper) => unknown) => selector(mockUiStateWrapper),
  selectStatsPollingInterval: (state: { ui: { statsPollingIntervalMs: number } }) => state.ui.statsPollingIntervalMs,
  selectStatsExpandedSections: (state: { ui: { statsExpandedSections: unknown } }) => state.ui.statsExpandedSections,
  setStatsPollingInterval: jest.fn(),
  setStatsSectionExpanded: jest.fn(),
}));

jest.mock("@/api", () => ({
  api: { util: { invalidateTags: (...args: unknown[]) => mockInvalidateTags(...args) } },
  useGetAvailableDatesQuery: (...args: unknown[]) => mockUseGetAvailableDatesQuery(...args),
  useListTillsQuery: (...args: unknown[]) => mockUseListTillsQuery(...args),
  useListProductsQuery: (...args: unknown[]) => mockUseListProductsQuery(...args),
  useGetRevenuePredictionQuery: (...args: unknown[]) => mockUseGetRevenuePredictionQuery(...args),
  useGetDashboardOverviewQuery: (...args: unknown[]) => mockUseGetDashboardOverviewQuery(...args),
  useGetPaymentMethodStatsQuery: (...args: unknown[]) => mockUseGetPaymentMethodStatsQuery(...args),
  useGetProductStatsQuery: (...args: unknown[]) => mockUseGetProductStatsQuery(...args),
  useGetRevenueByCounterQuery: (...args: unknown[]) => mockUseGetRevenueByCounterQuery(...args),
}));

jest.mock("./DashboardKPIs", () => ({
  DashboardKPIs: (props: { enabled?: boolean }) => <div data-testid="kpis">{props.enabled ? "enabled" : "disabled"}</div>,
}));

jest.mock("./RevenueByCounterChart", () => ({
  RevenueByCounterChart: (props: { enabled?: boolean }) => (
    <div data-testid="counter-chart">{props.enabled ? "enabled" : "disabled"}</div>
  ),
}));

jest.mock("./RevenueByProductChart", () => ({
  RevenueByProductChart: (props: { enabled?: boolean }) => (
    <div data-testid="product-chart">{props.enabled ? "enabled" : "disabled"}</div>
  ),
}));

jest.mock("./RevenueByCounterTable", () => ({
  RevenueByCounterTable: (props: { enabled?: boolean }) => (
    <div data-testid="counter-table">{props.enabled ? "enabled" : "disabled"}</div>
  ),
}));

jest.mock("./QuantitiesByProductTable", () => ({
  QuantitiesByProductTable: (props: { enabled?: boolean }) => (
    <div data-testid="quantities-table">{props.enabled ? "enabled" : "disabled"}</div>
  ),
}));

jest.mock("./OrdersTable", () => ({
  OrdersTable: (props: { enabled?: boolean }) => <div data-testid="orders-table">{props.enabled ? "enabled" : "disabled"}</div>,
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
  const expectedFromTimestamp = DateTime.fromISO("2026-01-03T06:00:00", { zone: "local" }).toISO();
  const expectedToTimestamp = DateTime.fromISO("2026-01-04T05:59:59.999", { zone: "local" }).toISO();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-03T12:00:00.000Z"));
    mockUiState = {
      statsPollingIntervalMs: 0,
      statsExpandedSections: {
        filters: false,
        kpis: false,
        prediction: false,
        counterChart: false,
        productChart: false,
        quantityTable: false,
        counterTable: false,
        orders: false,
      },
    };
    mockUseCurrentUserHasPrivilege.mockReset();
    mockDispatch.mockReset();
    mockUseGetAvailableDatesQuery.mockReset();
    mockUseListTillsQuery.mockReset();
    mockUseListProductsQuery.mockReset();
    mockUseGetRevenuePredictionQuery.mockReset();
    mockUseGetDashboardOverviewQuery.mockReset();
    mockUseGetPaymentMethodStatsQuery.mockReset();
    mockUseGetProductStatsQuery.mockReset();
    mockUseGetRevenueByCounterQuery.mockReset();
    mockInvalidateTags.mockReset();

    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return privilege.includes("can_book_orders");
      }
      return privilege === "view_node_stats" || privilege === "can_book_orders";
    });

    mockUseGetAvailableDatesQuery.mockReturnValue({ data: [] });
    mockUseListTillsQuery.mockReturnValue({ data: { ids: [], entities: {} } });
    mockUseListProductsQuery.mockReturnValue({ data: { ids: [], entities: {} } });
    mockUseGetRevenuePredictionQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetDashboardOverviewQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetPaymentMethodStatsQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetProductStatsQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetRevenueByCounterQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("initializes event pages to the current business day and skips collapsed section queries", () => {
    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <NodeStats />
      </MemoryRouter>
    );

    expect(mockUseGetDashboardOverviewQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        fromTimestamp: expectedFromTimestamp,
        toTimestamp: expectedToTimestamp,
      }),
      expect.objectContaining({ skip: true })
    );
    expect(mockUseGetProductStatsQuery).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: true }));
    expect(mockUseGetRevenueByCounterQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true })
    );
    expect(mockUseGetAvailableDatesQuery).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: true }));
    expect(screen.getByTestId("orders-table").textContent).toContain("disabled");
    expect(screen.getByLabelText("overview.filterDate").textContent).toContain("overview.today");
  });

  test("fetches only the expanded sections and shares one top-level product/counter query", () => {
    mockUiState = {
      statsPollingIntervalMs: 30000,
      statsExpandedSections: {
        filters: true,
        kpis: true,
        prediction: false,
        counterChart: true,
        productChart: true,
        quantityTable: true,
        counterTable: true,
        orders: false,
      },
    };

    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <NodeStats />
      </MemoryRouter>
    );

    expect(mockUseGetAvailableDatesQuery).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ skip: false }));
    expect(mockUseGetDashboardOverviewQuery).toHaveBeenCalledTimes(1);
    expect(mockUseGetPaymentMethodStatsQuery).toHaveBeenCalledTimes(1);
    expect(mockUseGetProductStatsQuery).toHaveBeenCalledTimes(1);
    expect(mockUseGetRevenueByCounterQuery).toHaveBeenCalledTimes(1);
    expect(mockUseGetProductStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        fromTimestamp: expectedFromTimestamp,
        toTimestamp: expectedToTimestamp,
      }),
      expect.objectContaining({ skip: false, pollingInterval: 30000 })
    );
    expect(mockUseGetRevenueByCounterQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: false, pollingInterval: 30000 })
    );
    expect(screen.getByTestId("kpis").textContent).toContain("enabled");
    expect(screen.getByTestId("product-chart").textContent).toContain("enabled");
    expect(screen.getByTestId("counter-chart").textContent).toContain("enabled");
    expect(screen.getByTestId("counter-table").textContent).toContain("enabled");
    expect(screen.getByTestId("quantities-table").textContent).toContain("enabled");
    expect(screen.getByTestId("orders-table").textContent).toContain("disabled");
  });

  test("shows the orders section for stats viewers with can_book_orders", () => {
    mockUiState = {
      statsPollingIntervalMs: 0,
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
    };

    render(
      <MemoryRouter initialEntries={["/node/5/stats"]}>
        <NodeStats />
      </MemoryRouter>
    );

    const ordersAccordion = screen.getByText("overview.orders").closest("[class*=MuiAccordion]") ?? screen.getByText("overview.orders").parentElement;
    expect(ordersAccordion).toBeTruthy();
    expect(screen.getByTestId("orders-table")).toBeTruthy();
    expect(within(screen.getByTestId("orders-table")).getByText("enabled")).toBeTruthy();
  });
});
