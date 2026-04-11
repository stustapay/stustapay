import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetTillQuery = jest.fn();
const mockUseUpdateTillMutation = jest.fn();
const mockUseCurrentNode = jest.fn();
const mockUpdateTill = jest.fn();

jest.mock("@/api", () => ({
  useGetTillQuery: (...args: unknown[]) => mockUseGetTillQuery(...args),
  useUpdateTillMutation: (...args: unknown[]) => mockUseUpdateTillMutation(...args),
}));

jest.mock("@/components", () => ({
  EditLayout: ({
    successRoute,
    onSubmit,
  }: {
    successRoute: string;
    onSubmit: (value: unknown) => void;
  }) => (
    <div>
      <div data-testid="success-route">{successRoute}</div>
      <button onClick={() => onSubmit({ name: "Updated Till" })}>submit</button>
    </div>
  ),
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: (...args: unknown[]) => mockUseCurrentNode(...args),
}));

jest.mock("@/app/layout", () => ({
  withPrivilegeGuard:
    (_privilege: unknown, Component: React.ComponentType) =>
    (props: unknown) =>
      <Component {...(props as object)} />,
}));

jest.mock("@/app/routes", () => ({
  TillRoutes: {
    list: (nodeId?: number) => `/node/${nodeId ?? 5}/tills`,
    detail: (id?: number | string | null, nodeId?: number) => `/node/${nodeId ?? 5}/tills/${id}`,
    edit: (id?: number | string | null, nodeId?: number) => `/node/${nodeId ?? 5}/tills/${id}/edit`,
  },
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/models", () => ({
  UpdateTillSchema: {},
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  useParams: () => ({ tillId: "12" }),
}));

jest.mock("./TillForm", () => ({
  TillForm: () => <div>form</div>,
}));

const { TillUpdate } = require("./TillUpdate");

describe("TillUpdate", () => {
  beforeEach(() => {
    mockUseGetTillQuery.mockReset();
    mockUseUpdateTillMutation.mockReset();
    mockUseCurrentNode.mockReset();
    mockUpdateTill.mockReset();
    mockUseUpdateTillMutation.mockReturnValue([mockUpdateTill]);
  });

  test("redirects edit routes to the till owner node", () => {
    mockUseCurrentNode.mockReturnValue({ currentNode: { id: 5 } });
    mockUseGetTillQuery.mockReturnValue({
      data: { id: 12, node_id: 9, name: "Child Till" },
      isLoading: false,
      error: undefined,
    });

    render(<TillUpdate />);

    expect(screen.getByTestId("navigate").textContent).toBe("/node/9/tills/12/edit");
  });

  test("submits updates against the till owner node", async () => {
    mockUseCurrentNode.mockReturnValue({ currentNode: { id: 9 } });
    mockUseGetTillQuery.mockReturnValue({
      data: { id: 12, node_id: 9, name: "Child Till" },
      isLoading: false,
      error: undefined,
    });

    render(<TillUpdate />);

    expect(screen.getByTestId("success-route").textContent).toBe("/node/9/tills/12");

    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(mockUpdateTill).toHaveBeenCalledWith({
        nodeId: 9,
        tillId: 12,
        newTill: { name: "Updated Till" },
      })
    );
  });
});
