import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetDashboardOverviewQuery = jest.fn();
const mockUsePendingPayoutDetailQuery = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();

jest.mock("@/api", () => ({
  useGetDashboardOverviewQuery: (...args: unknown[]) => mockUseGetDashboardOverviewQuery(...args),
  usePendingPayoutDetailQuery: (...args: unknown[]) => mockUsePendingPayoutDetailQuery(...args),
}));

jest.mock("@/app/layout", () => ({
  withPrivilegeGuard:
    (_privilege: unknown, Component: React.ComponentType) =>
    (props: unknown) =>
      <Component {...(props as object)} />,
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({
    currentNode: { id: 5 },
  }),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
  useCurrencyFormatter:
    () =>
    (value?: number | null) =>
      value == null ? "-" : `EUR ${value.toFixed(2)}`,
}));

jest.mock("@/components", () => ({
  ButtonLink: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  DetailView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailField: ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  DetailNumberField: ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{typeof value === "number" ? `EUR ${value.toFixed(2)}` : value}</span>
    </div>
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { CustomerOverview } = require("./CustomerOverview");

describe("CustomerOverview", () => {
  beforeEach(() => {
    mockUseGetDashboardOverviewQuery.mockReset();
    mockUsePendingPayoutDetailQuery.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return privilege.includes("node_administration");
      }

      return privilege === "node_administration" || privilege === "payout_management";
    });
  });

  test("renders metrics, payout summary, and quick action links", () => {
    mockUseGetDashboardOverviewQuery.mockReturnValue({
      data: {
        total_guest_credit: 1234.5,
        guests_with_credit: 42,
        guests_paid_out: 9,
        online_donation: 150.25,
        online_for_payout: 320.75,
      },
      isLoading: false,
      isError: false,
    });
    mockUsePendingPayoutDetailQuery.mockReturnValue({
      data: {
        total_payout_amount: 500.5,
        total_donation_amount: 40,
        n_payouts: 7,
      },
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/customers"]}>
        <CustomerOverview />
      </MemoryRouter>
    );

    expect(screen.getByText("customer.overviewTitle")).toBeTruthy();
    expect(screen.getByText("overview.totalGuestCredit")).toBeTruthy();
    expect(screen.getByText("EUR 1234.50")).toBeTruthy();
    expect(screen.getByText("payoutRun.totalPayoutAmount")).toBeTruthy();
    expect(screen.getByText("EUR 500.50")).toBeTruthy();

    expect(screen.getByText("customer.openSearch").closest("a")?.getAttribute("href")).toBe("/node/5/customers/search");
    expect(screen.getByText("customer.tagSwap.open").closest("a")?.getAttribute("href")).toBe("/node/5/customers/tag-swap");
    expect(screen.getByText("customer.openPayoutRuns").closest("a")?.getAttribute("href")).toBe("/node/5/payout-runs");
    expect(screen.getByText("customer.openAccounts").closest("a")?.getAttribute("href")).toBe("/node/5/accounts");
    expect(screen.getByText("customer.openUserTags").closest("a")?.getAttribute("href")).toBe("/node/5/user-tags");
  });

  test("shows section loading placeholders", () => {
    mockUseGetDashboardOverviewQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    mockUsePendingPayoutDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/customers"]}>
        <CustomerOverview />
      </MemoryRouter>
    );

    expect(screen.getByTestId("customer-overview-kpi-loading")).toBeTruthy();
    expect(screen.getByTestId("customer-overview-payout-loading")).toBeTruthy();
  });

  test("keeps the overview visible when payout data is unavailable", () => {
    mockUseGetDashboardOverviewQuery.mockReturnValue({
      data: {
        total_guest_credit: 1234.5,
        guests_with_credit: 42,
        guests_paid_out: 9,
        online_donation: 150.25,
        online_for_payout: 320.75,
      },
      isLoading: false,
      isError: false,
    });
    mockUsePendingPayoutDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/customers"]}>
        <CustomerOverview />
      </MemoryRouter>
    );

    expect(screen.getByText("overview.totalGuestCredit")).toBeTruthy();
    expect(screen.getByText("overview.noDataAvailable")).toBeTruthy();
    expect(screen.getByText("customer.openSearch")).toBeTruthy();
  });

  test("reduces the overview for customer management without admin-only target privileges", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return false;
      }

      return false;
    });
    mockUseGetDashboardOverviewQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    mockUsePendingPayoutDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/customers"]}>
        <CustomerOverview />
      </MemoryRouter>
    );

    expect(mockUseGetDashboardOverviewQuery).toHaveBeenCalledWith(
      { nodeId: 5 },
      expect.objectContaining({ skip: true })
    );
    expect(mockUsePendingPayoutDetailQuery).toHaveBeenCalledWith(
      { nodeId: 5 },
      expect.objectContaining({ skip: true })
    );
    expect(screen.queryByText("customer.openPayoutRuns")).toBeNull();
    expect(screen.queryByText("customer.openAccounts")).toBeNull();
    expect(screen.queryByText("customer.openUserTags")).toBeNull();
    expect(screen.getByText("customer.openSearch")).toBeTruthy();
    expect(screen.getByText("customer.tagSwap.open")).toBeTruthy();
  });
});
