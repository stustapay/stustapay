import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetTillQuery = jest.fn();
const mockUseListOrdersByTillQuery = jest.fn();
const mockUseListTillProfilesQuery = jest.fn();
const mockUseListTerminalsQuery = jest.fn();
const mockUseDeleteTillMutation = jest.fn();
const mockUseRemoveFromTerminalMutation = jest.fn();
const mockUseCurrentNode = jest.fn();
const mockOpenModal = jest.fn();
const mockNavigate = jest.fn();
const mockRemoveFromTerminal = jest.fn();

jest.mock("@/api", () => ({
  useGetTillQuery: (...args: unknown[]) => mockUseGetTillQuery(...args),
  useListOrdersByTillQuery: (...args: unknown[]) => mockUseListOrdersByTillQuery(...args),
  useListTillProfilesQuery: (...args: unknown[]) => mockUseListTillProfilesQuery(...args),
  useListTerminalsQuery: (...args: unknown[]) => mockUseListTerminalsQuery(...args),
  useDeleteTillMutation: (...args: unknown[]) => mockUseDeleteTillMutation(...args),
  useRemoveFromTerminalMutation: (...args: unknown[]) => mockUseRemoveFromTerminalMutation(...args),
  selectOrderAll: () => [],
  selectTillProfileById: (data: { entities: Record<number, { name: string }> }, id: number) => data.entities[id],
  selectTerminalById: (data: { entities: Record<number, { name: string }> }, id: number) => data.entities[id],
}));

jest.mock("@/components", () => ({
  DetailLayout: ({
    actions,
    children,
  }: {
    actions: Array<{ hidden?: boolean; label: string; onClick: () => void }>;
    children: React.ReactNode;
  }) => (
    <div>
      {actions.filter((action) => !action.hidden).map((action) => (
        <button key={action.label} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
      {children}
    </div>
  ),
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
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/features", () => ({
  OrderTable: () => <div>orders</div>,
  TillSwitchTerminal: () => <div>switch-terminal</div>,
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: (...args: unknown[]) => mockUseCurrentNode(...args),
}));

jest.mock("@/app/routes", () => ({
  TillRoutes: {
    list: (nodeId?: number) => `/node/${nodeId ?? 5}/tills`,
    detail: (id?: number | string | null, nodeId?: number) => `/node/${nodeId ?? 5}/tills/${id}`,
    edit: (id?: number | string | null, nodeId?: number) => `/node/${nodeId ?? 5}/tills/${id}/edit`,
  },
  TerminalRoutes: {
    detail: (id?: number | string | null, nodeId?: number) => `/node/${nodeId ?? 5}/terminals/${id}`,
  },
  TillProfileRoutes: {
    detail: (id?: number | string | null) => `/profiles/${id}`,
  },
  TseRoutes: {
    detail: (id?: number | string | null) => `/tses/${id}`,
  },
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/modal-provider", () => ({
  useOpenModal: () => mockOpenModal,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  useNavigate: () => mockNavigate,
  useParams: () => ({ tillId: "12" }),
}));

const { TillDetail } = require("./TillDetail");

describe("TillDetail", () => {
  beforeEach(() => {
    mockUseGetTillQuery.mockReset();
    mockUseListOrdersByTillQuery.mockReset();
    mockUseListTillProfilesQuery.mockReset();
    mockUseListTerminalsQuery.mockReset();
    mockUseDeleteTillMutation.mockReset();
    mockUseRemoveFromTerminalMutation.mockReset();
    mockUseCurrentNode.mockReset();
    mockOpenModal.mockReset();
    mockNavigate.mockReset();
    mockRemoveFromTerminal.mockReset();

    mockUseListOrdersByTillQuery.mockReturnValue({ orders: [], error: undefined });
    mockUseListTillProfilesQuery.mockReturnValue({
      data: { entities: { 3: { id: 3, name: "Profile" } } },
      error: undefined,
    });
    mockUseListTerminalsQuery.mockReturnValue({
      data: { entities: { 7: { id: 7, name: "Terminal 7", node_id: 9 } } },
      error: undefined,
    });
    mockUseDeleteTillMutation.mockReturnValue([jest.fn()]);
    mockUseRemoveFromTerminalMutation.mockReturnValue([mockRemoveFromTerminal]);
  });

  test("redirects to the till owner node when opened from an ancestor node URL", () => {
    mockUseCurrentNode.mockReturnValue({ currentNode: { id: 5 } });
    mockUseGetTillQuery.mockReturnValue({
      data: {
        id: 12,
        name: "Child Till",
        description: "",
        active_profile_id: 3,
        terminal_id: null,
        node_id: 9,
      },
      error: undefined,
    });

    render(<TillDetail />);

    expect(screen.getByTestId("navigate").textContent).toBe("/node/9/tills/12");
  });

  test("uses the till owner node for remove-from-terminal mutations", async () => {
    mockUseCurrentNode.mockReturnValue({ currentNode: { id: 9 } });
    mockUseGetTillQuery.mockReturnValue({
      data: {
        id: 12,
        name: "Child Till",
        description: "",
        active_profile_id: 3,
        terminal_id: 7,
        node_id: 9,
      },
      error: undefined,
    });

    render(<TillDetail />);

    fireEvent.click(screen.getByRole("button", { name: "till.removeFromTerminal" }));

    const modal = mockOpenModal.mock.calls[0][0];
    modal.onConfirm();

    await waitFor(() =>
      expect(mockRemoveFromTerminal).toHaveBeenCalledWith({
        nodeId: 9,
        tillId: 12,
      })
    );
  });
});
