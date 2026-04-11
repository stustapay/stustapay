import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseCurrentUserHasPrivilege = jest.fn();
const mockUseCurrentNodeAllowsObject = jest.fn();

jest.mock("@/hooks", () => ({
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
  useCurrentNodeAllowsObject: (...args: unknown[]) => mockUseCurrentNodeAllowsObject(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { EventPageLayout } = require("./EventPageLayout");

describe("EventPageLayout", () => {
  const node = {
    id: 5,
    event: {},
  } as const;

  beforeEach(() => {
    mockUseCurrentUserHasPrivilege.mockReset();
    mockUseCurrentNodeAllowsObject.mockReset();
  });

  test("shows payouts tab when payout routes are accessible", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string | string[]) =>
      Array.isArray(privilege) ? privilege.includes("payout_management") : privilege === "node_administration"
    );
    mockUseCurrentNodeAllowsObject.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <EventPageLayout node={node} />
      </MemoryRouter>
    );

    expect(screen.getByRole("tab", { name: "Payouts" })).toBeTruthy();
  });

  test("hides payouts tab when payout routes are not accessible", () => {
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);
    mockUseCurrentNodeAllowsObject.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <EventPageLayout node={node} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("tab", { name: "Payouts" })).toBeNull();
  });

  test("shows payouts but hides node admin tabs for payout managers without node administration", () => {
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string | string[]) =>
      Array.isArray(privilege) ? privilege.includes("payout_management") : false
    );
    mockUseCurrentNodeAllowsObject.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <EventPageLayout node={node} />
      </MemoryRouter>
    );

    expect(screen.getByRole("tab", { name: "Payouts" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "systemAccounts" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Tax Rates" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "dsfinvk" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "nodes.settings" })).toBeNull();
  });
});
