import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { TextDecoder, TextEncoder } from "util";

declare global {
  type MockedSharedMountedSumUpCard = {
    unmount: jest.Mock<void, []>;
    update: jest.Mock<void, []>;
  };
  // eslint-disable-next-line no-var
  var SumUpCard: {
    mount: jest.Mock<MockedSharedMountedSumUpCard, [unknown]>;
  };
  // eslint-disable-next-line no-var
  var TextEncoder: typeof globalThis.TextEncoder;
  // eslint-disable-next-line no-var
  var TextDecoder: typeof globalThis.TextDecoder;
}

globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

const translations: Record<string, string> = {
  "topup.shared.title": "Group Top-Up",
  "topup.shared.description": "Top up the group balance for Test Event.",
  "topup.shared.name": "Your name",
  "topup.amount": "Amount",
  "topup.next": "Next",
  "topup.processingPayment": "Processing payment",
  "topup.awaiting3ds": "Waiting for authentication",
  "topup.paymentTakingTooLong": "Payment is taking longer than expected.",
  "topup.success.title": "Top-up successful",
  "topup.shared.success": "The group chip balance has been topped up.",
  "topup.error.title": "Top-up failed",
  "topup.error.message": "An unknown error occurred.",
  "topup.errorWhileCreatingCheckout": "Error while trying to create sumup checkout",
  "topup.cancelled.defaultMessage": "The payment was cancelled or timed out. You can try again.",
  "topup.tryAgain": "Try again",
};

const translate = (key: string) => translations[key] ?? key;

const mockCreateSharedTopupCheckout = jest.fn();
const mockCheckSharedTopupCheckout = jest.fn();
const mockGetSharedTopupPublicInfo = jest.fn();

jest.mock("@/api", () => ({
  useGetSharedTopupPublicInfoQuery: (...args: unknown[]) => mockGetSharedTopupPublicInfo(...args),
  useCreateSharedTopupCheckoutMutation: () => [mockCreateSharedTopupCheckout],
  useCheckSharedTopupCheckoutMutation: () => [mockCheckSharedTopupCheckout],
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
  FormCurrencyInput: ({ name, label, formik }: {
    name: string;
    label: string;
    formik: { values: Record<string, number>; setFieldValue: (field: string, value: number) => void };
  }) => (
    <input
      aria-label={label}
      value={formik.values[name] ?? ""}
      onChange={(event) => formik.setFieldValue(name, Number(event.target.value))}
    />
  ),
  FormTextField: ({ name, label, formik }: {
    name: string;
    label: string;
    formik: { values: Record<string, string>; setFieldValue: (field: string, value: string) => void };
  }) => (
    <input
      aria-label={label}
      value={formik.values[name] ?? ""}
      onChange={(event) => formik.setFieldValue(name, event.target.value)}
    />
  ),
}));

jest.mock("@stustapay/utils", () => ({
  toFormikValidationSchema: () => undefined,
}));

jest.mock("react-i18next", () => ({
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

const { MemoryRouter, Route, Routes } = require("react-router-dom");
const { SharedTopUp } = require("./SharedTopUp");

describe("SharedTopUp", () => {
  const advanceTimersByTime = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const renderSharedTopUp = (initialEntry = "/shared-topup/shared-token") =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/shared-topup/:sharedTopupToken" element={<SharedTopUp />} />
        </Routes>
      </MemoryRouter>
    );

  const startSharedTopUp = async () => {
    renderSharedTopUp();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alice" } });
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
    mockCreateSharedTopupCheckout.mockReset();
    mockCheckSharedTopupCheckout.mockReset();
    mockGetSharedTopupPublicInfo.mockReset();
    mockGetSharedTopupPublicInfo.mockReturnValue({
      data: {
        event_name: "Test Event",
        currency_identifier: "EUR",
        payment_methods: ["card"],
      },
      error: undefined,
      isLoading: false,
    });
    mockCreateSharedTopupCheckout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkout_id: "checkout-1",
          order_uuid: "f151823d-ce1e-4080-a38d-39583282eaeb",
        }),
    });
    mockCheckSharedTopupCheckout.mockReturnValue({
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

  test("continues polling automatically when the shared checkout takes longer than expected", async () => {
    jest.useFakeTimers();

    await startSharedTopUp();
    await advanceSuccessPollToExtendedPending();

    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

    const callsAfterExtendedPending = mockCheckSharedTopupCheckout.mock.calls.length;

    await advanceTimersByTime(29999);
    expect(mockCheckSharedTopupCheckout).toHaveBeenCalledTimes(callsAfterExtendedPending);

    await advanceTimersByTime(1);
    expect(mockCheckSharedTopupCheckout.mock.calls.length).toBeGreaterThan(callsAfterExtendedPending);
  });

  test("extended polling still resolves to success", async () => {
    jest.useFakeTimers();
    let checkoutStatus = "PENDING";
    mockCheckSharedTopupCheckout.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ status: checkoutStatus }),
    }));

    await startSharedTopUp();
    await advanceSuccessPollToExtendedPending();

    checkoutStatus = "PAID";
    await advanceTimersByTime(30 * 1000);

    await screen.findByText("Top-up successful");
  });
});
