import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetOrderQuery = jest.fn();
const mockUseListUsersQuery = jest.fn();
const mockUseListTillsQuery = jest.fn();
const mockUseListCashRegistersAdminQuery = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();
const mockNavigate = jest.fn();
const mockOpenModal = jest.fn();

jest.mock("@/api", () => ({
  useGetOrderQuery: (...args: unknown[]) => mockUseGetOrderQuery(...args),
  useListUsersQuery: (...args: unknown[]) => mockUseListUsersQuery(...args),
  useListTillsQuery: (...args: unknown[]) => mockUseListTillsQuery(...args),
  useListCashRegistersAdminQuery: (...args: unknown[]) => mockUseListCashRegistersAdminQuery(...args),
  useCancelOrderMutation: () => [jest.fn()],
  selectUserById: (data: { entities: Record<number, unknown> }, id: number) => data.entities[id],
  selectTillById: (data: { entities: Record<number, unknown> }, id: number) => data.entities[id],
  selectCashRegisterById: (data: { entities: Record<number, unknown> }, id: number) => data.entities[id],
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({ currentNode: { id: 5, event_node_id: 5 } }),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
}));

jest.mock("@/components", () => ({
  DetailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailField: ({ label, value, linkTo }: { label: string; value: React.ReactNode; linkTo?: string }) => (
    <div>
      <span>{label}</span>
      {linkTo ? <a href={linkTo}>{value}</a> : <span>{value}</span>}
    </div>
  ),
  DetailNumberField: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
}));

jest.mock("@/components/LineItemTable", () => ({
  LineItemTable: () => <div data-testid="line-items">line-items</div>,
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/modal-provider", () => ({
  useOpenModal: () => mockOpenModal,
}));

jest.mock("@stustapay/models", () => ({
  formatUserTagUid: (value: string) => value,
  getUserName: (user: { display_name: string }) => user.display_name,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ orderId: "42" }),
  };
});

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
  },
}));

const { MemoryRouter } = require("react-router-dom");
const { OrderDetail } = require("./OrderDetail");

describe("OrderDetail", () => {
  beforeEach(() => {
    mockUseGetOrderQuery.mockReset();
    mockUseListUsersQuery.mockReset();
    mockUseListTillsQuery.mockReset();
    mockUseListCashRegistersAdminQuery.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();
    mockNavigate.mockReset();
    mockOpenModal.mockReset();
  });

  test("renders order details for can_book_orders users without admin metadata access", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: unknown) => {
      if (Array.isArray(privilege)) {
        return privilege.includes("can_book_orders");
      }
      return privilege === "can_book_orders";
    });
    mockUseGetOrderQuery.mockReturnValue({
      data: {
        id: 42,
        payment_method: "tag",
        order_type: "sale",
        booked_at: "2026-01-01T12:00:00.000Z",
        cashier_id: 8,
        till_id: 9,
        cash_register_id: 10,
        customer_account_id: 11,
        customer_tag_id: 12,
        customer_tag_uid_hex: "A1B2C3",
        total_no_tax: 4,
        total_tax: 1,
        total_price: 5,
        line_items: [],
      },
      error: undefined,
      isLoading: false,
    });
    mockUseListUsersQuery.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
    mockUseListTillsQuery.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
    mockUseListCashRegistersAdminQuery.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

    render(
      <MemoryRouter initialEntries={["/node/5/orders/42"]}>
        <OrderDetail />
      </MemoryRouter>
    );

    expect(mockUseListUsersQuery).toHaveBeenCalledWith({ nodeId: 5 }, { skip: true });
    expect(mockUseListTillsQuery).toHaveBeenCalledWith({ nodeId: 5 }, { skip: true });
    expect(mockUseListCashRegistersAdminQuery).toHaveBeenCalledWith({ nodeId: 5 }, { skip: true });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("ID: 8")).toBeTruthy();
    expect(screen.getByText("ID: 9")).toBeTruthy();
    expect(screen.getByText("ID: 10")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "11" })).toBeNull();
    expect(screen.queryByRole("link", { name: "A1B2C3" })).toBeNull();
  });
});
