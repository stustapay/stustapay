import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

const mockFetchConfig = jest.fn();

jest.mock("@/api/common", () => ({
  config: {
    apiConfig: {
      currency_identifier: "EUR",
      node_id: 7,
    },
  },
  fetchConfig: () => mockFetchConfig(),
}));

jest.mock("@/api", () => ({
  api: {
    util: {
      resetApiState: () => ({ type: "api/reset" }),
    },
  },
}));

jest.mock("@/store", () => ({
  store: {
    getState: () => ({
      auth: {
        token: null,
        portalNodeId: 7,
      },
    }),
    dispatch: jest.fn(),
  },
  forceLogout: () => ({ type: "auth/forceLogout" }),
  shouldResetPersistedPortalAuth: () => false,
}));

jest.mock("@stustapay/framework", () => ({
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>Loading</div>,
  MaintenancePage: ({ title, message }: { title: string; message: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

jest.mock("./Router", () => ({
  Router: () => <div>Customer Portal Router</div>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: (_namespace?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      (
        {
          "errorPage.brand": "TeamFestlichPay",
          "errorPage.maintenance": "Maintenance in progress",
          "errorPage.currentlyUnavailable":
            "The TeamFestlichPay customer portal is currently unavailable. Please try again later.",
        } as Record<string, string>
      )[options?.keyPrefix ? `${options.keyPrefix}.${key}` : key] ?? key,
  }),
}));

const { App } = require("./App");

describe("Customer portal App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the maintenance page when config bootstrap fails", async () => {
    mockFetchConfig.mockRejectedValue(new Error("boom"));

    render(<App />);

    expect(await screen.findByText("Maintenance in progress")).toBeTruthy();
    expect(
      screen.getByText("The TeamFestlichPay customer portal is currently unavailable. Please try again later.")
    ).toBeTruthy();
    expect(screen.queryByText("Customer Portal Router")).toBeNull();
  });

  test("renders the app router when config bootstrap succeeds", async () => {
    mockFetchConfig.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => expect(screen.getByText("Customer Portal Router")).toBeTruthy());
    expect(screen.queryByText("Maintenance in progress")).toBeNull();
  });
});
