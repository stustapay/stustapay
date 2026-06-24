import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

const mockFetchConfig = jest.fn();
const mockUseAppSelector = jest.fn();

jest.mock("@/api/common", () => ({
  fetchConfig: () => mockFetchConfig(),
}));

jest.mock("@/store", () => ({
  useAppSelector: () => mockUseAppSelector(),
}));

jest.mock("@/store/uiSlice", () => ({
  selectTheme: jest.fn(),
}));

jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>Loading</div>,
  MaintenancePage: ({ title, message }: { title: string; message: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

jest.mock("./layout/UnauthenticatedLayout", () => ({
  UnauthenticatedLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./Router", () => ({
  Router: () => <div>Administration Router</div>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          TeamFestlichPay: "TeamFestlichPay",
          "errorPage.brand": "TeamFestlichPay",
          "errorPage.maintenance": "Maintenance in progress",
          "errorPage.currentlyUnavailable":
            "The TeamFestlichPay administration is currently unavailable. Please try again later.",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

const { App } = require("./App");

describe("Administration App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockReturnValue("light");
  });

  test("renders the maintenance page when config bootstrap fails", async () => {
    mockFetchConfig.mockRejectedValue(new Error("boom"));

    render(<App />);

    expect(await screen.findByText("Maintenance in progress")).toBeTruthy();
    expect(
      screen.getByText("The TeamFestlichPay administration is currently unavailable. Please try again later.")
    ).toBeTruthy();
    expect(screen.queryByText("Administration Router")).toBeNull();
  });

  test("renders the app router when config bootstrap succeeds", async () => {
    mockFetchConfig.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => expect(screen.getByText("Administration Router")).toBeTruthy());
    expect(screen.queryByText("Maintenance in progress")).toBeNull();
  });
});
