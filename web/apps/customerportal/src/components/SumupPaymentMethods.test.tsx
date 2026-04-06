import { render, screen } from "@testing-library/react";
import * as React from "react";

import { SumupPaymentMethods } from "./SumupPaymentMethods";

const translations: Record<string, string> = {
  "topup.description": "You can top up your balance online with SumUp here.",
  "topup.availablePaymentMethods": "Available payment methods",
  "topup.paymentMethods.apple_pay": "Apple Pay",
  "topup.paymentMethods.blik": "BLIK",
  "topup.paymentMethods.card": "Card",
  "topup.paymentMethods.google_pay": "Google Pay",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe("SumupPaymentMethods", () => {
  test("renders known payment methods as translated chips", () => {
    render(<SumupPaymentMethods paymentMethods={["card", "apple_pay", "google_pay"]} />);

    expect(screen.getByText("You can top up your balance online with SumUp here.")).toBeTruthy();
    expect(screen.getByText("Available payment methods")).toBeTruthy();
    expect(screen.getByText("Card")).toBeTruthy();
    expect(screen.getByText("Apple Pay")).toBeTruthy();
    expect(screen.getByText("Google Pay")).toBeTruthy();
  });

  test("formats unknown payment methods and hides duplicate chips", () => {
    render(<SumupPaymentMethods paymentMethods={["bank_redirect_plus", "BANK_REDIRECT_PLUS", "blik"]} />);

    expect(screen.getByText("Bank Redirect Plus")).toBeTruthy();
    expect(screen.getAllByText("Bank Redirect Plus")).toHaveLength(1);
    expect(screen.getByText("BLIK")).toBeTruthy();
  });

  test("does not render a payment method header when no methods are provided", () => {
    render(<SumupPaymentMethods paymentMethods={[]} />);

    expect(screen.queryByText("Available payment methods")).toBeNull();
  });
});
