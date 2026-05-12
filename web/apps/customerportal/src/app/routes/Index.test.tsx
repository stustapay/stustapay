import { render, screen } from "@testing-library/react";
import * as React from "react";
import { TextDecoder, TextEncoder } from "util";

declare global {
  // eslint-disable-next-line no-var
  var TextEncoder: typeof globalThis.TextEncoder;
  // eslint-disable-next-line no-var
  var TextDecoder: typeof globalThis.TextDecoder;
}

globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

const mockUseGetCustomerQuery = jest.fn();
const mockUsePayoutInfoQuery = jest.fn();
const mockUsePublicConfig = jest.fn();

const translations: Record<string, string> = {
  errorLoadingCustomer: "Error loading customer",
  "payout.onlyDuringEvent": "Fallback payout disabled notice",
};

jest.mock("@/api", () => ({
  useGetCustomerQuery: () => mockUseGetCustomerQuery(),
  usePayoutInfoQuery: () => mockUsePayoutInfoQuery(),
}));

jest.mock("@/components", () => ({
  SumupPaymentMethods: () => <div>SumUp payment methods</div>,
}));

jest.mock("@/hooks", () => ({
  useCurrencyFormatter: () => (amount: number) => `EUR ${amount.toFixed(2)}`,
}));

jest.mock("@/hooks/usePublicConfig", () => ({
  usePublicConfig: () => mockUsePublicConfig(),
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>Loading</div>,
}));

jest.mock("@stustapay/models", () => ({
  formatUserTagUid: (value: string) => value,
}));

jest.mock("react-i18next", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
    i18n: { language: "en-US" },
  }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock("./OrderList", () => ({
  OrderList: () => <div>Order list</div>,
}));

const { MemoryRouter } = require("react-router-dom");
const { Index } = require("./Index");

describe("Index payout disabled notice", () => {
  beforeEach(() => {
    mockUseGetCustomerQuery.mockReturnValue({
      data: {
        balance: 12,
        donation: 0,
        has_entered_info: false,
        vouchers: 0,
        user_tag_pin: "1234",
        user_tag_uid_hex: "abcd1234",
      },
      error: undefined,
      isLoading: false,
    });
    mockUsePayoutInfoQuery.mockReturnValue({
      data: {
        in_payout_run: false,
        payout_date: null,
      },
      error: undefined,
      isLoading: false,
    });
    mockUsePublicConfig.mockReturnValue({
      payout_enabled: false,
      sumup_topup_enabled: false,
      sumup_topup_payment_methods: [],
      translation_texts: {},
    });
  });

  const renderIndex = () =>
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

  test("shows the event-specific disabled payout notice when configured", () => {
    mockUsePublicConfig.mockReturnValue({
      payout_enabled: false,
      sumup_topup_enabled: false,
      sumup_topup_payment_methods: [],
      translation_texts: {
        "en-US": {
          payout_disabled_notice: "Custom disabled notice",
        },
      },
    });

    renderIndex();

    expect(screen.getByText("Custom disabled notice")).toBeTruthy();
  });

  test("falls back to the default disabled payout notice when no override is configured", () => {
    renderIndex();

    expect(screen.getByText("Fallback payout disabled notice")).toBeTruthy();
  });
});
