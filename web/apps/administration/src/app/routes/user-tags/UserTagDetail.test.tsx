import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseGetUserTagDetailQuery = jest.fn();
const mockUseUpdateUserTagCommentMutation = jest.fn();
const mockUseUpdateUserTagGroupTagMutation = jest.fn();
const mockUseUpdateUserTagVipStatusMutation = jest.fn();
const mockUseUpdateUserTagAccountCreationBlockedMutation = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/api", () => ({
  useGetUserTagDetailQuery: (...args: unknown[]) => mockUseGetUserTagDetailQuery(...args),
  useUpdateUserTagCommentMutation: (...args: unknown[]) => mockUseUpdateUserTagCommentMutation(...args),
  useUpdateUserTagGroupTagMutation: (...args: unknown[]) => mockUseUpdateUserTagGroupTagMutation(...args),
  useUpdateUserTagVipStatusMutation: (...args: unknown[]) => mockUseUpdateUserTagVipStatusMutation(...args),
  useUpdateUserTagAccountCreationBlockedMutation: (...args: unknown[]) =>
    mockUseUpdateUserTagAccountCreationBlockedMutation(...args),
}));

jest.mock("@/components", () => ({
  DetailLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailField: ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  EditableListItem: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/ListItemLink", () => ({
  ListItemLink: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/hooks", () => ({
  useCurrentNode: () => ({
    currentNode: { id: 5 },
  }),
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
}));

jest.mock("@stustapay/framework", () => ({
  DataGrid: () => <div>grid</div>,
  DataGridTitle: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@stustapay/models", () => ({
  formatUserTagUid: (value: string) => value,
}));

jest.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => jest.fn(),
  useParams: () => ({ userTagId: "12" }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { UserTagDetail } = require("./UserTagDetail");

describe("UserTagDetail", () => {
  beforeEach(() => {
    mockUseGetUserTagDetailQuery.mockReset();
    mockUseUpdateUserTagCommentMutation.mockReset();
    mockUseUpdateUserTagGroupTagMutation.mockReset();
    mockUseUpdateUserTagVipStatusMutation.mockReset();
    mockUseUpdateUserTagAccountCreationBlockedMutation.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  test("updates the account creation block toggle", async () => {
    const updateAccountCreationBlocked = jest.fn(() => ({
      unwrap: () => Promise.resolve({}),
    }));

    mockUseGetUserTagDetailQuery.mockReturnValue({
      data: {
        id: 12,
        pin: "PIN-12",
        uid: null,
        comment: null,
        account_id: 41,
        user_id: null,
        is_vip: false,
        group_tag: null,
        account_creation_blocked: false,
        account_history: [],
      },
      error: undefined,
      isLoading: false,
    });
    mockUseUpdateUserTagCommentMutation.mockReturnValue([jest.fn()]);
    mockUseUpdateUserTagGroupTagMutation.mockReturnValue([jest.fn()]);
    mockUseUpdateUserTagVipStatusMutation.mockReturnValue([jest.fn()]);
    mockUseUpdateUserTagAccountCreationBlockedMutation.mockReturnValue([updateAccountCreationBlocked]);

    render(<UserTagDetail />);

    fireEvent.click(screen.getByLabelText("userTag.accountCreationBlocked"));

    await waitFor(() =>
      expect(updateAccountCreationBlocked).toHaveBeenCalledWith({
        nodeId: 5,
        userTagId: 12,
        updateAccountCreationBlockedPayload: { account_creation_blocked: true },
      })
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("userTag.accountCreationBlockedEnabled"));
  });
});
