import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockAcceptInvitation = jest.fn();
const mockNavigate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/api", () => ({
  useAcceptInvitationMutation: () => [mockAcceptInvitation],
}));

jest.mock("@stustapay/form-components", () => ({
  FormTextField: ({
    name,
    label,
    formik,
    type,
  }: {
    name: string;
    label: string;
    formik: { values: Record<string, string>; handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void };
    type?: string;
  }) => <input aria-label={label} name={name} type={type} value={formik.values[name]} onChange={formik.handleChange} />,
}));

jest.mock("@stustapay/utils", () => ({
  toFormikValidationSchema: () => ({
    validate: async (values: unknown) => values,
    validateSync: (values: unknown) => values,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

const { MemoryRouter } = require("react-router-dom");
const { AcceptInvitation } = require("./AcceptInvitation");

describe("AcceptInvitation", () => {
  beforeEach(() => {
    mockAcceptInvitation.mockReset();
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  test("redirects to login with the invited username after setting the password", async () => {
    mockAcceptInvitation.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({
        status: "success",
        message: "Password set successfully. You can now sign in with your username.",
        login: "crew-user",
      }),
    });

    render(
      <MemoryRouter initialEntries={["/accept-invitation?token=invite-token"]}>
        <AcceptInvitation />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("userPassword"), { target: { value: "safe-password" } });
    fireEvent.change(screen.getByLabelText("user.confirmPassword"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "user.setPassword" }));

    await waitFor(() =>
      expect(mockAcceptInvitation).toHaveBeenCalledWith({
        acceptInvitationPayload: {
          token: "invite-token",
          password: "safe-password",
        },
      })
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/login?username=crew-user&invitationAccepted=1")
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("user.invitationAccepted");
  });
});
