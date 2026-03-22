import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Form, Formik } from "formik";
import { ZodIssue } from "zod";
import { TextDecoder, TextEncoder } from "util";
import type { NewUserTags } from "./UserTagsCreate";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const { UserTagsCreateForm, buildCreateUserTagsPayload, initialValues, NewUserTagsSchema } = require("./UserTagsCreate");

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({
    currentNode: {
      id: 1,
    },
  }),
}));

jest.mock("@/api", () => ({
  useCreateUserTagsMutation: () => [jest.fn()],
  useListUserTagSecretsQuery: () => ({
    data: [
      {
        id: 1,
        description: "Default secret",
      },
    ],
  }),
}));

jest.mock("@/components/features", () => ({
  RestrictionSelect: () => <div data-testid="restriction-select" />,
}));

jest.mock("@stustapay/components", () => ({
  Select: () => <div data-testid="secret-select" />,
}));

jest.mock("@stustapay/form-components", () => ({
  FormTextField: ({ name, label, formik }: { name: string; label: string; formik: { values: Record<string, string>; setFieldValue: (field: string, value: string) => void } }) => (
    <input
      aria-label={label}
      value={formik.values[name] ?? ""}
      onChange={(event) => formik.setFieldValue(name, event.target.value)}
    />
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.row != null && options?.message != null) {
        return `${key}:${options.row}:${options.message}`;
      }
      return key;
    },
  }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

class MockFileReader {
  public onload: ((event: { target: { result: string } }) => void) | null = null;

  public readAsText(file: Blob & { __text?: string }) {
    this.onload?.({ target: { result: file.__text ?? "" } });
  }
}

describe("UserTagsCreateForm", () => {
  beforeAll(() => {
    Object.defineProperty(window, "FileReader", {
      configurable: true,
      writable: true,
      value: MockFileReader,
    });
  });

  const setIssue = (target: Record<string, unknown>, path: (string | number)[], message: string) => {
    let current: Record<string, unknown> | unknown[] = target;
    path.forEach((segment, index) => {
      const isLast = index === path.length - 1;
      const nextSegment = path[index + 1];

      if (typeof segment === "number") {
        const currentArray = current as unknown[];
        if (isLast) {
          currentArray[segment] = message;
          return;
        }

        currentArray[segment] ??= typeof nextSegment === "number" ? [] : {};
        current = currentArray[segment] as Record<string, unknown> | unknown[];
        return;
      }

      const currentObject = current as Record<string, unknown>;
      if (isLast) {
        currentObject[segment] = message;
        return;
      }

      currentObject[segment] ??= typeof nextSegment === "number" ? [] : {};
      current = currentObject[segment] as Record<string, unknown> | unknown[];
    });
  };

  const buildFormikErrors = (issues: ZodIssue[]) => {
    const errors: Record<string, unknown> = {};
    issues.forEach((issue) => {
      setIssue(errors, issue.path, issue.message);
    });
    return errors;
  };

  const renderForm = (onSubmit = jest.fn()) =>
    render(
      <Formik<NewUserTags>
        initialValues={{ ...initialValues, secret_id: 1 }}
        validate={(values) => {
          const result = NewUserTagsSchema.safeParse(values);
          return result.success ? {} : buildFormikErrors(result.error.issues);
        }}
        onSubmit={onSubmit}
      >
        {(formik) => (
          <Form>
            <UserTagsCreateForm {...formik} />
            <button type="submit">submit</button>
          </Form>
        )}
      </Formik>
    );

  test("accepts manual grid entry and submits form values", async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fireEvent.change(screen.getByTestId("user-tag-grid-pin-0"), { target: { value: "pin-001" } });
    fireEvent.change(screen.getByTestId("user-tag-grid-uid-0"), { target: { value: "0x1A" } });
    fireEvent.change(screen.getByTestId("user-tag-grid-group_tag-0"), { target: { value: "crew" } });
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submittedValues = onSubmit.mock.calls[0][0] as NewUserTags;
    expect(submittedValues.tags[0].pin).toBe("pin-001");
    expect(submittedValues.tags[0].uid).toBe("0x1A");
    expect(submittedValues.tags[0].group_tag).toBe("crew");
  });

  test("blocks submit when duplicate pins exist in the grid", async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fireEvent.change(screen.getByTestId("user-tag-grid-pin-0"), { target: { value: "pin-001" } });
    fireEvent.click(screen.getByText("userTag.grid.addRow"));
    fireEvent.change(screen.getByTestId("user-tag-grid-pin-1"), { target: { value: "pin-001" } });
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getAllByText("userTag.gridErrors.duplicatePin").length).toBeGreaterThan(0);
    });
  });

  test("imports CSV rows into the same grid", async () => {
    renderForm();

    const file = new File([""], "tags.csv", { type: "text/csv" }) as File & { __text?: string };
    file.__text = "pin,uid,comment\npin-001,0x1A,hello";
    fireEvent.change(screen.getByTestId("user-tag-csv-upload"), {
      target: {
        files: [file],
      },
    });

    fireEvent.click(await screen.findByText("userTag.columnMapping.applyMapping"));

    await waitFor(() => {
      expect((screen.getByTestId("user-tag-grid-pin-0") as HTMLInputElement).value).toBe("pin-001");
      expect((screen.getByTestId("user-tag-grid-uid-0") as HTMLInputElement).value).toBe("0x1A");
      expect((screen.getByTestId("user-tag-grid-comment-0") as HTMLInputElement).value).toBe("hello");
    });
  });

  test("applies default group tag only to rows without an explicit group tag", () => {
    const payload = buildCreateUserTagsPayload({
      ...initialValues,
      secret_id: 1,
      default_group_tag: "fallback-group",
      tags: [
        {
          ...initialValues.tags[0],
          pin: "pin-001",
          group_tag: "",
        },
        {
          ...initialValues.tags[0],
          id: "second-row",
          pin: "pin-002",
          group_tag: "crew",
        },
      ],
    });

    expect(payload).toEqual([
      expect.objectContaining({ pin: "pin-001", group_tag: "fallback-group" }),
      expect.objectContaining({ pin: "pin-002", group_tag: "crew" }),
    ]);
  });
});
