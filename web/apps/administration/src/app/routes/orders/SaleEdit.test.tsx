import * as React from "react";

const mockWithPrivilegeGuard = jest.fn((_privilege: unknown, Component: React.ComponentType) => Component);

jest.mock("@/app/layout", () => ({
  withPrivilegeGuard: (...args: unknown[]) => mockWithPrivilegeGuard(...args),
}));

jest.mock("@/app/routes", () => ({
  OrderRoutes: {
    privilege: ["node_administration", "can_book_orders"],
  },
}));

jest.mock("@/api", () => ({
  useGetOrderQuery: jest.fn(),
}));

jest.mock("@/components", () => ({
  ListItemLink: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({ currentNode: { id: 5 } }),
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => null,
}));

jest.mock("@stustapay/models", () => ({
  formatUserTagUid: (value: string) => value,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ orderId: "1" }),
}));

describe("SaleEdit", () => {
  beforeEach(() => {
    mockWithPrivilegeGuard.mockClear();
    jest.resetModules();
  });

  test("uses the shared order privilege guard", async () => {
    await import("./SaleEdit");

    expect(mockWithPrivilegeGuard).toHaveBeenCalledWith(["node_administration", "can_book_orders"], expect.any(Function));
  });
});
