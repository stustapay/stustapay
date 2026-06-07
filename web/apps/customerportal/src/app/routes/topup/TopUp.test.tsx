import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { TextDecoder, TextEncoder } from "util";

declare global {
  type MockedMountedSumUpCard = {
    unmount: jest.Mock<void, []>;
    update: jest.Mock<void, []>;
  };
  // eslint-disable-next-line no-var
  var SumUpCard: {
    mount: jest.Mock<MockedMountedSumUpCard, [unknown]>;
  };
  // eslint-disable-next-line no-var
  var TextEncoder: typeof globalThis.TextEncoder;
  // eslint-disable-next-line no-var
  var TextDecoder: typeof globalThis.TextDecoder;
}

globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

const translations: Record<string, string> = {
  "topup.onlineTopUp": "Online Top-Up",
  "topup.amount": "Amount",
  "topup.amountHelper": "Choose an amount or enter your own.",
  "topup.next": "Next",
  "topup.tryAgain": "Try again",
  "topup.processingPayment": "Processing payment",
  "topup.paymentTakingTooLong": "Payment is taking longer than expected.",
  "topup.success.title": "Top-up successful",
  "topup.cancelled.title": "Payment cancelled",
  "topup.cancelled.message": "The payment was cancelled or timed out.",
  "topup.cancelled.defaultMessage": "The payment was cancelled or timed out. You can try again.",
  "topup.error.message": "An unknown error occurred.",
  "topup.errorWhileCreatingCheckout": "Error while trying to create sumup checkout",
  "topup.errorAmountMustBeIntegral": "Cent amounts are not allowed",
  "topup.errorAmountGreaterZero": "Amount must be greater than 0",
};

const translate = (key: string) => translations[key] ?? key;

const mockCreateCheckout = jest.fn();
const mockCheckCheckout = jest.fn();

jest.mock("@/api", () => ({
  useGetCustomerQuery: () => ({
    data: { id: 1, balance: 120 },
    error: undefined,
    isLoading: false,
  }),
  useCreateCheckoutMutation: () => [mockCreateCheckout],
  useCheckCheckoutMutation: () => [mockCheckCheckout],
}));

jest.mock("@/components", () => ({
  PageContainer: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  SumupPaymentMethods: () => <div>SumUp payment methods</div>,
}));

jest.mock("@/hooks", () => ({
  usePublicConfig: () => ({
    sumup_topup_enabled: true,
    sumup_topup_payment_methods: ["card"],
  }),
}));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    t: translate,
  },
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>Loading</div>,
}));

jest.mock("@stustapay/form-components", () => ({
  FormCurrencyInput: ({
    name,
    label,
    formik,
    helperText,
  }: {
    name: string;
    label: string;
    helperText?: string;
    formik: { values: Record<string, number>; setFieldValue: (field: string, value: number) => void };
  }) => (
    <div>
      <input
        aria-label={label}
        value={formik.values[name] ?? ""}
        onChange={(event) => formik.setFieldValue(name, Number(event.target.value))}
      />
      {helperText ? <span>{helperText}</span> : null}
    </div>
  ),
}));

jest.mock("@stustapay/utils", () => ({
  toFormikValidationSchema: () => undefined,
}));

jest.mock("react-i18next", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useTranslation: () => ({
    t: translate,
    i18n: { language: "en" },
  }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const { MemoryRouter } = require("react-router-dom");
const { TopUp } = require("./TopUp");

describe("TopUp", () => {
  const advanceTimersByTime = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const startTopUp = async () => {
    renderTopUp();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("Processing payment");
  };

  const triggerSumupResponse = async (type: "sent" | "auth-screen" | "error" | "success") => {
    const cardOptions = globalThis.SumUpCard.mount.mock.calls[0][0] as {
      onResponse?: (type: "sent" | "auth-screen" | "error" | "success") => void;
    };

    expect(cardOptions.onResponse).toBeDefined();

    await act(async () => {
      cardOptions.onResponse?.(type);
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const advanceSuccessPollToExtendedPending = async () => {
    await triggerSumupResponse("success");

    for (const delayMs of [1000, 2000, 4000, 8000, 8000, 8000, 8000]) {
      await advanceTimersByTime(delayMs);
    }

    await screen.findByText("Payment is taking longer than expected.");
  };

  beforeEach(() => {
    mockCreateCheckout.mockReset();
    mockCheckCheckout.mockReset();
    mockCreateCheckout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkout_id: "checkout-1",
          order_uuid: "f151823d-ce1e-4080-a38d-39583282eaeb",
        }),
    });
    mockCheckCheckout.mockReturnValue({
      unwrap: () => Promise.resolve({ status: "PENDING" }),
    });
    globalThis.SumUpCard = {
      mount: jest.fn(() => ({
        unmount: jest.fn(),
        update: jest.fn(),
      })),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderTopUp = () =>
    render(
      <MemoryRouter>
        <TopUp />
      </MemoryRouter>
    );

  test("does not show retry controls while a checkout is still unresolved", async () => {
    await startTopUp();

    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  test("shows quick amounts and keeps submit disabled until a valid amount is chosen", () => {
    renderTopUp();

    expect(screen.getByText("Choose an amount or enter your own.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "10 EUR" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "20 EUR" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "50 EUR" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("clicking a quick amount sets the form value and enables submit", async () => {
    renderTopUp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "20 EUR" }));
      await Promise.resolve();
    });

    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("20");
    expect(screen.getByRole("button", { name: "20 EUR" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("manual input overrides a previously selected quick amount", async () => {
    renderTopUp();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "20 EUR" }));
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "35" } });
      await Promise.resolve();
    });

    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("35");
    expect(screen.getByRole("button", { name: "20 EUR" }).getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("returns to a retryable state only after the backend reports failure", async () => {
    mockCheckCheckout.mockReturnValue({ unwrap: () => Promise.resolve({ status: "FAILED" }) });

    renderTopUp();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("Payment cancelled");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  test("continues polling automatically when the checkout takes longer than expected", async () => {
    jest.useFakeTimers();

    await startTopUp();
    await advanceSuccessPollToExtendedPending();

    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.queryByRole("button", { name: /check status/i })).toBeNull();

    const callsAfterExtendedPending = mockCheckCheckout.mock.calls.length;

    await advanceTimersByTime(29999);
    expect(mockCheckCheckout).toHaveBeenCalledTimes(callsAfterExtendedPending);

    await advanceTimersByTime(1);
    expect(mockCheckCheckout.mock.calls.length).toBeGreaterThan(callsAfterExtendedPending);
  });

  test("extended polling still resolves to success", async () => {
    jest.useFakeTimers();
    let checkoutStatus = "PENDING";
    mockCheckCheckout.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ status: checkoutStatus }),
    }));

    await startTopUp();
    await advanceSuccessPollToExtendedPending();

    checkoutStatus = "PAID";
    await advanceTimersByTime(30 * 1000);

    await screen.findByText("Top-up successful");
  });

  test("extended polling still resolves to a retryable cancelled state", async () => {
    jest.useFakeTimers();
    let checkoutStatus = "PENDING";
    mockCheckCheckout.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ status: checkoutStatus }),
    }));

    await startTopUp();
    await advanceSuccessPollToExtendedPending();

    checkoutStatus = "FAILED";
    await advanceTimersByTime(30 * 1000);

    await screen.findByText("Payment cancelled");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
