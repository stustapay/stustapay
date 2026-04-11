import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetCustomerQuery = jest.fn();
const mockUseListOrdersQuery = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();
const mockAllowCustomerPayoutMutation = jest.fn();
const mockPreventCustomerPayoutMutation = jest.fn();
const mockDisableAccountMutation = jest.fn();
const mockUpdateAccountCommentMutation = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@/api", () => ({
  useGetCustomerQuery: (...args: unknown[]) => mockUseGetCustomerQuery(...args),
  useListOrdersQuery: (...args: unknown[]) => mockUseListOrdersQuery(...args),
  useAllowCustomerPayoutMutation: (...args: unknown[]) => mockAllowCustomerPayoutMutation(...args),
  usePreventCustomerPayoutMutation: (...args: unknown[]) => mockPreventCustomerPayoutMutation(...args),
  useDisableAccountMutation: (...args: unknown[]) => mockDisableAccountMutation(...args),
  useUpdateAccountCommentMutation: (...args: unknown[]) => mockUpdateAccountCommentMutation(...args),
  selectOrderAll: (data: unknown) => data,
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
}));

jest.mock("@/components", () => ({
  DetailLayout: ({ children, actions }: { actions?: { label: string }[]; children: React.ReactNode }) => (
    <div>
      <div data-testid="customer-detail-actions">{actions?.map((action) => action.label).join("|")}</div>
      {children}
    </div>
  ),
  DetailView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailBoolField: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
  DetailNumberField: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
  DetailField: ({
    label,
    value,
    linkTo,
    secondaryAction,
  }: {
    label: string;
    value: React.ReactNode;
    linkTo?: string;
    secondaryAction?: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {linkTo ? <a href={linkTo}>{value}</a> : <span>{value}</span>}
      {secondaryAction}
    </div>
  ),
  EditableListItem: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div data-testid="editable-list-item">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/features", () => ({
  OrderTable: () => <div data-testid="customer-detail-orders">orders</div>,
}));

jest.mock("../accounts/components/AccountTagHistoryTable", () => ({
  AccountTagHistoryTable: () => <div data-testid="account-tag-history">history</div>,
}));

jest.mock("../accounts/components/EditAccountVoucherAmountModal", () => ({
  EditAccountVoucherAmountModal: () => <div data-testid="edit-voucher-modal">voucher-modal</div>,
}));

jest.mock("../accounts/components/TransferAccountBalanceModal", () => ({
  TransferAccountBalanceModal: () => <div data-testid="transfer-balance-modal">transfer-modal</div>,
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/models", () => ({
  Privilege: {
    node_administration: "node_administration",
    payout_management: "payout_management",
    customer_management: "customer_management",
    view_node_stats: "view_node_stats",
  },
  formatUserTagUid: (value: string) => value,
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ customerId: "41" }),
  };
});

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { CustomerDetail } = require("./CustomerDetail");

describe("CustomerDetail", () => {
  beforeEach(() => {
    mockUseGetCustomerQuery.mockReset();
    mockUseListOrdersQuery.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();
    mockAllowCustomerPayoutMutation.mockReset();
    mockPreventCustomerPayoutMutation.mockReset();
    mockDisableAccountMutation.mockReset();
    mockUpdateAccountCommentMutation.mockReset();
    mockNavigate.mockReset();

    mockAllowCustomerPayoutMutation.mockReturnValue([jest.fn()]);
    mockPreventCustomerPayoutMutation.mockReturnValue([jest.fn()]);
    mockDisableAccountMutation.mockReturnValue([jest.fn()]);
    mockUpdateAccountCommentMutation.mockReturnValue([jest.fn()]);
  });

  test("keeps customer detail usable for customer management while hiding admin-only features", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return privilege.includes("customer_management");
      }

      return privilege === "customer_management";
    });
    mockUseGetCustomerQuery.mockReturnValue({
      data: {
        id: 41,
        type: "private",
        user_tag_id: 17,
        user_tag_uid_hex: "ABCDEF",
        name: "Customer 41",
        comment: "Support note",
        balance: 12.5,
        vouchers: 3,
        has_entered_info: true,
        account_name: "Ada Customer",
        iban: "DE89370400440532013000",
        email: "ada@example.com",
        donate_all: false,
        donation: 0,
        payout_export: false,
        payout: null,
        tag_history: [],
      },
      error: undefined,
      isLoading: false,
    });
    mockUseListOrdersQuery.mockReturnValue({
      orders: undefined,
      error: undefined,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/node/5/customers/41"]}>
        <CustomerDetail />
      </MemoryRouter>
    );

    expect(mockUseListOrdersQuery).toHaveBeenCalledWith(
      { nodeId: 5, customerAccountId: 41 },
      expect.objectContaining({ skip: true, selectFromResult: expect.any(Function) })
    );
    expect(screen.getByTestId("customer-detail-actions").textContent).toBe("customer.allowPayout");
    expect(screen.queryByTestId("editable-list-item")).toBeNull();
    expect(screen.queryByTestId("customer-detail-orders")).toBeNull();
    expect(screen.queryByTestId("transfer-balance-modal")).toBeNull();
    expect(screen.queryByTestId("edit-voucher-modal")).toBeNull();
    expect(screen.queryByRole("link", { name: "ABCDEF" })).toBeNull();
    expect(screen.getByText("Support note")).toBeTruthy();
    expect(screen.getByText("customer.payoutExportPrevented")).toBeTruthy();
  });
});
