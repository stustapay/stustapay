import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Form, Formik } from "formik";
import { TerminalForm } from "./TerminalForm";

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({
    currentNode: {
      id: 1,
    },
  }),
}));

jest.mock("@/api", () => ({
  useListEntryAreasQuery: () => ({
    entryAreas: [],
  }),
  selectEntryAreaAll: () => [],
}));

jest.mock("@stustapay/components", () => ({
  Select: () => <div data-testid="entry-area-select" />,
}));

jest.mock("@stustapay/form-components", () => ({
  FormTextField: ({
    name,
    label,
    formik,
  }: {
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
  FormSelect: ({
    name,
    label,
    options,
    formik,
  }: {
    name: string;
    label: string;
    options: string[];
    formik: { values: Record<string, string>; setFieldValue: (field: string, value: string) => void };
  }) => (
    <select
      aria-label={label}
      value={formik.values[name] ?? ""}
      onChange={(event) => formik.setFieldValue(name, event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
  FormCheckbox: ({
    name,
    label,
    disabled,
    formik,
  }: {
    name: string;
    label: string;
    disabled?: boolean;
    formik: { values: Record<string, boolean>; setFieldValue: (field: string, value: boolean) => void };
  }) => (
    <input
      type="checkbox"
      aria-label={label}
      checked={formik.values[name] ?? false}
      disabled={disabled}
      onChange={(event) => formik.setFieldValue(name, event.target.checked)}
    />
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("TerminalForm", () => {
  const renderForm = (initialValues: {
    name: string;
    description: string | null;
    mode: "till" | "entry" | "exit";
    entry_area_id: number | null;
    self_service: boolean;
    app_display_mode: "day" | "night" | null;
  }) =>
    render(
      <Formik initialValues={initialValues} onSubmit={jest.fn()}>
        {(formik) => (
          <Form>
            <TerminalForm {...formik} />
          </Form>
        )}
      </Formik>
    );

  test("enables self-service for till terminals", () => {
    renderForm({
      name: "Terminal",
      description: null,
      mode: "till",
      entry_area_id: null,
      self_service: true,
      app_display_mode: "day",
    });

    const checkbox = screen.getByLabelText("terminal.selfService") as HTMLInputElement;
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(true);
  });

  test("clears and disables self-service when switching away from till mode", async () => {
    renderForm({
      name: "Terminal",
      description: null,
      mode: "till",
      entry_area_id: null,
      self_service: true,
      app_display_mode: "night",
    });

    fireEvent.change(screen.getByLabelText("terminal.mode.label"), { target: { value: "entry" } });

    await waitFor(() => {
      const checkbox = screen.getByLabelText("terminal.selfService") as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByLabelText("terminal.appDisplayMode.label")).toBeNull();
    });
  });

  test("shows display mode selector only for self-service till terminals", () => {
    renderForm({
      name: "Terminal",
      description: null,
      mode: "till",
      entry_area_id: null,
      self_service: true,
      app_display_mode: null,
    });

    expect(screen.getByLabelText("terminal.appDisplayMode.label")).toBeTruthy();
  });
});
