import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { NumericInput } from "./NumericInput";

describe("NumericInput", () => {
  test("applies mobile-friendly integer input attributes", () => {
    render(<NumericInput value={null} onChange={jest.fn()} integerOnly parseOnChange label="Amount" />);

    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("pattern")).toBe("[0-9]*");
  });

  test("propagates integer values while typing when parseOnChange is enabled", () => {
    const onChange = jest.fn();

    render(<NumericInput value={null} onChange={onChange} integerOnly parseOnChange label="Amount" />);

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42" } });

    expect(onChange).toHaveBeenLastCalledWith(42);
  });

  test("propagates null when the field is cleared", () => {
    const onChange = jest.fn();

    render(<NumericInput value={12} onChange={onChange} integerOnly parseOnChange label="Amount" />);

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "" } });

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
