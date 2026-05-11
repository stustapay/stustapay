import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

jest.mock("@/api", () => ({
  useGetProfileQuery: () => ({
    data: null,
  }),
  useGetTreeForCurrentUserQuery: () => ({
    data: {
      id: 1,
      name: "Festival",
      parent_ids: [],
      children: [
        {
          id: 42,
          name: "Bar 1",
          parent_ids: [1],
          children: [],
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useLogoutMutation: () => [
    () => ({
      unwrap: () => Promise.resolve(),
    }),
  ],
}));

jest.mock("@/api/common", () => ({
  config: {
    testMode: false,
    testModeMessage: "",
  },
}));

jest.mock("@/components", () => {
  const React = require("react");

  return {
    AppBar: ({ children }: { children: unknown }) => <div>{children}</div>,
    DrawerHeader: () => <div data-testid="drawer-header" />,
    Main: ({ children }: { children: unknown }) => <main>{children}</main>,
    LanguageSelect: () => <div data-testid="language-select" />,
  };
});

jest.mock("@/store", () => ({
  selectCurrentUser: "selectCurrentUser",
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => ({
    login: "admin",
  }),
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
  TestModeDisclaimer: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("./navigation-tree", () => ({
  NavigationTree: () => <div>navigation-tree</div>,
}));

const { MemoryRouter, Route, Routes } = require("react-router-dom");
const { AuthenticatedRoot } = require("./AuthenticatedRoot");

describe("AuthenticatedRoot", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test("renders a help shortcut that preserves the current node context", () => {
    render(
      <MemoryRouter initialEntries={["/node/42/products"]}>
        <Routes>
          <Route element={<AuthenticatedRoot />}>
            <Route path="*" element={<div>Outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "help.open" }).getAttribute("href")).toBe("/help?nodeId=42");
  });

  test("renders the current node path in the header", () => {
    render(
      <MemoryRouter initialEntries={["/node/42/products"]}>
        <Routes>
          <Route element={<AuthenticatedRoot />}>
            <Route path="*" element={<div>Outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("TeamFestlichPay")).toBeTruthy();
    expect(screen.getByText("Festival > Bar 1")).toBeTruthy();
    expect(screen.getByRole("link", { name: "auth.profile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "logout" })).toBeTruthy();
  });
});
