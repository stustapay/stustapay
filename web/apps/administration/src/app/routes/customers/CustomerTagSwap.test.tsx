import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseFindCustomerTagSwapCandidatesMutation = jest.fn();
const mockUseSwapCustomerTagMutation = jest.fn();
const mockNavigate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/api", () => ({
  useFindCustomerTagSwapCandidatesMutation: (...args: unknown[]) => mockUseFindCustomerTagSwapCandidatesMutation(...args),
  useSwapCustomerTagMutation: (...args: unknown[]) => mockUseSwapCustomerTagMutation(...args),
}));

jest.mock("@/app/layout", () => ({
  withPrivilegeGuard:
    (_privilege: unknown, Component: React.ComponentType) =>
    (props: unknown) =>
      <Component {...(props as object)} />,
}));

jest.mock("@/components", () => ({
  DetailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({
    currentNode: { id: 5 },
  }),
  useDebounce: (value: string) => value,
}));

jest.mock("@stustapay/models", () => ({
  Privilege: { node_administration: "node_administration" },
  formatUserTagUid: (value: string) => value,
}));

jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");

  return {
    ...actual,
    Autocomplete: ({
      options,
      value,
      inputValue,
      onInputChange,
      onChange,
      renderInput,
      getOptionLabel,
      getOptionDisabled,
    }: any) => (
      <div>
        {renderInput({
          inputProps: {
            value: inputValue,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => onInputChange?.(event, event.target.value, "input"),
          },
          InputProps: { endAdornment: null },
        })}
        <div>
          {options.map((option: any) => (
            <button
              key={option.user_tag_id}
              type="button"
              disabled={getOptionDisabled?.(option) ?? false}
              onClick={(event) => {
                onChange?.(event, option, "selectOption");
                onInputChange?.(event, getOptionLabel(option), "reset");
              }}
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>
        {value ? <div data-testid="customer-tag-swap-selected-value">{getOptionLabel(value)}</div> : null}
      </div>
    ),
  };
});

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("react-toastify", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.accountId != null) {
        return `${key}:${options.accountId}`;
      }
      return key;
    },
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { CustomerTagSwap } = require("./CustomerTagSwap");

describe("CustomerTagSwap", () => {
  beforeEach(() => {
    mockUseFindCustomerTagSwapCandidatesMutation.mockReset();
    mockUseSwapCustomerTagMutation.mockReset();
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  test("submits the selected source and target tags with blocking enabled by default", async () => {
    const findSourceCandidates = jest.fn(() => ({
      unwrap: () =>
        Promise.resolve([
          {
            user_tag_id: 11,
            pin: "SRC-001",
            uid: null,
            comment: "broken wristband",
            account_id: 41,
          },
        ]),
    }));
    const findTargetCandidates = jest.fn(() => ({
      unwrap: () =>
        Promise.resolve([
          {
            user_tag_id: 12,
            pin: "DST-002",
            uid: null,
            comment: "replacement wristband",
            account_id: 77,
            target_mode: "reuse_stub",
            target_reason: null,
          },
        ]),
    }));
    const swapCustomerTag = jest.fn(() => ({
      unwrap: () =>
        Promise.resolve({
          customer_account_id: 77,
          used_existing_target_account: true,
        }),
    }));

    let hookCall = 0;
    mockUseFindCustomerTagSwapCandidatesMutation.mockImplementation(() => {
      const result =
        hookCall % 2 === 0
          ? [findSourceCandidates, { isLoading: false, isError: false }]
          : [findTargetCandidates, { isLoading: false, isError: false }];
      hookCall += 1;
      return result;
    });
    mockUseSwapCustomerTagMutation.mockReturnValue([swapCustomerTag, { isLoading: false }]);

    render(
      <MemoryRouter initialEntries={["/node/5/customers/tag-swap"]}>
        <CustomerTagSwap />
      </MemoryRouter>
    );

    const sourceInput = screen.getByTestId("customer-tag-swap-source-input");
    const targetInput = screen.getByTestId("customer-tag-swap-target-input");
    const blockCheckbox = screen.getByLabelText("customer.tagSwap.blockSourceLabel");

    expect((blockCheckbox as HTMLInputElement).checked).toBe(true);

    fireEvent.change(sourceInput, { target: { value: "SRC" } });
    await waitFor(() =>
      expect(findSourceCandidates).toHaveBeenCalledWith({
        nodeId: 5,
        findTagSwapCandidatesPayload: { search_term: "SRC", mode: "source" },
      })
    );
    fireEvent.click(screen.getByText("SRC-001 | broken wristband | customer.tagSwap.accountLabel:41"));
    expect(screen.getByTestId("customer-tag-swap-selected-value").textContent).toBe(
      "SRC-001 | broken wristband | customer.tagSwap.accountLabel:41"
    );

    fireEvent.change(targetInput, { target: { value: "DST" } });
    await waitFor(() =>
      expect(findTargetCandidates).toHaveBeenCalledWith({
        nodeId: 5,
        findTagSwapCandidatesPayload: { search_term: "DST", mode: "target" },
      })
    );
    fireEvent.click(screen.getByText("DST-002 | replacement wristband | customer.tagSwap.accountLabel:77"));

    fireEvent.change(screen.getByTestId("customer-tag-swap-comment-input"), {
      target: { value: "swap because source tag is defective" },
    });
    fireEvent.click(screen.getByText("customer.tagSwap.submit"));

    await waitFor(() =>
      expect(swapCustomerTag).toHaveBeenCalledWith({
        nodeId: 5,
        swapCustomerTagPayload: {
          source_user_tag_id: 11,
          target_user_tag_id: 12,
          comment: "swap because source tag is defective",
          block_source_tag: true,
        },
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/node/5/customers/77"));
    expect(mockToastSuccess).toHaveBeenCalledWith("customer.tagSwap.success:77");
  });
});
