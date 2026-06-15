import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

const translations: Record<string, string> = {
  "topup.shared.ownerTitle": "Group Top-Up",
  "topup.shared.ownerDescription": "Create a group top-up link.",
  "topup.shared.createLink": "Create link",
  "topup.shared.createFailed": "Could not create link.",
  "topup.shared.created": "Link created and copied.",
  "topup.shared.label": "Label",
  "topup.shared.noLabel": "No label",
  "topup.shared.link": "Group top-up link",
  "topup.shared.copy": "Copy link",
  "topup.shared.copied": "Link copied.",
  "topup.shared.copyFailed": "Could not copy link.",
  "topup.shared.oneTimeLinkNotice": "Copy this link now.",
  "topup.shared.replace": "Replace link",
  "topup.shared.replaced": "Link replaced and copied.",
  "topup.shared.replaceFailed": "Could not replace link.",
  "topup.shared.revoke": "Revoke link",
  "topup.shared.revoked": "Link revoked.",
  "topup.shared.revokeFailed": "Could not revoke link.",
  "topup.shared.createdAt": "Created",
  "topup.shared.status": "Status",
  "topup.shared.actions": "Actions",
  "topup.shared.activeStatus": "Active",
  "topup.shared.revokedStatus": "Revoked",
  "topup.shared.contributionsTitle": "Group top-ups",
  "topup.shared.noContributions": "No top-ups yet.",
  "topup.shared.name": "Your name",
  "topup.shared.contributionStatus.booked": "Paid",
  "topup.amount": "Amount",
};

const translate = (key: string) => translations[key] ?? key;

const mockListSharedTopupLinks = jest.fn();
const mockListSharedTopupContributions = jest.fn();
const mockCreateSharedTopupLink = jest.fn();
const mockRevokeSharedTopupLink = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

jest.mock("@/api", () => ({
  useListSharedTopupLinksQuery: () => mockListSharedTopupLinks(),
  useListSharedTopupContributionsQuery: () => mockListSharedTopupContributions(),
  useCreateSharedTopupLinkMutation: () => [mockCreateSharedTopupLink],
  useRevokeSharedTopupLinkMutation: () => [mockRevokeSharedTopupLink],
}));

jest.mock("@/components", () => ({
  PageContainer: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("@/hooks", () => ({
  useCurrencyFormatter: () => (amount: number) => `${amount.toFixed(2)} EUR`,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: translate }),
}));

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const { SharedTopUpOwner } = require("./SharedTopUpOwner");

describe("SharedTopUpOwner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSharedTopupLinks.mockReturnValue({
      data: [
        {
          id: 1,
          token: null,
          created_at: "2026-06-01T10:00:00Z",
          expires_at: null,
          revoked_at: null,
          label: "Friends",
        },
      ],
    });
    mockListSharedTopupContributions.mockReturnValue({
      data: [
        {
          order_uuid: "booked-order",
          contributor_name: "Alice",
          amount: 20,
          status: "booked",
          created_at: "2026-06-01T10:05:00Z",
          booked_at: "2026-06-01T10:06:00Z",
        },
        {
          order_uuid: "pending-order",
          contributor_name: "Bob",
          amount: 10,
          status: "pending",
          created_at: "2026-06-01T10:07:00Z",
          booked_at: null,
        },
      ],
    });
    mockCreateSharedTopupLink.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 2, token: "new-token", label: "Friends" }),
    });
    mockRevokeSharedTopupLink.mockReturnValue({
      unwrap: () => Promise.resolve(),
    });
    window.history.replaceState({}, "", "/topup/shared");
  });

  test("creates a labelled one-time visible link", async () => {
    render(<SharedTopUpOwner />);

    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Friends" } });
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    await screen.findByDisplayValue("http://localhost/shared-topup/new-token");
    expect(mockCreateSharedTopupLink).toHaveBeenCalledWith({
      createSharedTopupLinkPayload: { label: "Friends" },
    });
    expect(screen.getByText("Copy this link now.")).not.toBeNull();
    expect(screen.getByTestId("qr-code").textContent).toBe("http://localhost/shared-topup/new-token");
  });

  test("shows only booked contributions", () => {
    render(<SharedTopUpOwner />);

    expect(screen.getByText("Alice")).not.toBeNull();
    expect(screen.getByText("20.00 EUR")).not.toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.queryByText("10.00 EUR")).toBeNull();
  });

  test("replaces an active link by revoking it and creating a new one with the same label", async () => {
    render(<SharedTopUpOwner />);

    fireEvent.click(screen.getByLabelText("Replace link"));

    await waitFor(() => {
      expect(mockRevokeSharedTopupLink).toHaveBeenCalledWith({ linkId: 1 });
      expect(mockCreateSharedTopupLink).toHaveBeenCalledWith({
        createSharedTopupLinkPayload: { label: "Friends" },
      });
    });
    expect(await screen.findByDisplayValue("http://localhost/shared-topup/new-token")).not.toBeNull();
  });
});
