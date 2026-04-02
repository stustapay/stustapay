import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseListTerminalsQuery = jest.fn();
const mockUseSwitchTerminalMutation = jest.fn();
const mockUseListTillsQuery = jest.fn();
const mockUseSwitchTillMutation = jest.fn();

let mockTerminalOptions: Array<{ id: number; name: string; node_id: number; till_id: number | null }> = [];
let mockTillOptions: Array<{ id: number; name: string; node_id: number; terminal_id: number | null }> = [];

jest.mock("@/api", () => ({
  useListTerminalsQuery: (...args: unknown[]) => mockUseListTerminalsQuery(...args),
  useSwitchTerminalMutation: (...args: unknown[]) => mockUseSwitchTerminalMutation(...args),
  selectTerminalAll: () => mockTerminalOptions,
  useListTillsQuery: (...args: unknown[]) => mockUseListTillsQuery(...args),
  useSwitchTillMutation: (...args: unknown[]) => mockUseSwitchTillMutation(...args),
  selectTillAll: () => mockTillOptions,
}));

jest.mock("@mui/material", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Typography: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@stustapay/components", () => ({
  Loading: () => <div>loading</div>,
  Select: ({
    options,
    formatOption,
  }: {
    options: Array<unknown>;
    formatOption: (option: unknown) => string;
  }) => (
    <ul>
      {options.map((option, index) => (
        <li key={index}>{formatOption(option)}</li>
      ))}
    </ul>
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { TillSwitchTerminal } = require("./TillSwitchTerminal");
const { TerminalSwitchTill } = require("./TerminalSwitchTill");

describe("assignment switch filters", () => {
  beforeEach(() => {
    mockUseListTerminalsQuery.mockReset();
    mockUseSwitchTerminalMutation.mockReset();
    mockUseListTillsQuery.mockReset();
    mockUseSwitchTillMutation.mockReset();

    mockUseSwitchTerminalMutation.mockReturnValue([jest.fn()]);
    mockUseSwitchTillMutation.mockReturnValue([jest.fn()]);
    mockUseListTerminalsQuery.mockImplementation((_arg: unknown, options?: { selectFromResult?: (arg: unknown) => unknown }) =>
      options?.selectFromResult
        ? options.selectFromResult({ data: { ids: [], entities: {} } })
        : { data: { ids: [], entities: {} } }
    );
    mockUseListTillsQuery.mockImplementation((_arg: unknown, options?: { selectFromResult?: (arg: unknown) => unknown }) =>
      options?.selectFromResult
        ? options.selectFromResult({ data: { ids: [], entities: {} } })
        : { data: { ids: [], entities: {} } }
    );
  });

  test("TillSwitchTerminal only shows unassigned terminals from the till node", () => {
    mockTerminalOptions = [
      { id: 1, name: "Local Free", node_id: 9, till_id: null },
      { id: 2, name: "Local Taken", node_id: 9, till_id: 4 },
      { id: 3, name: "Ancestor Free", node_id: 5, till_id: null },
    ];

    render(<TillSwitchTerminal tillId={12} nodeId={9} open onClose={() => undefined} />);

    expect(screen.getByText("Local Free")).toBeTruthy();
    expect(screen.queryByText("Local Taken")).toBeNull();
    expect(screen.queryByText("Ancestor Free")).toBeNull();
  });

  test("TerminalSwitchTill only shows unassigned tills from the terminal node", () => {
    mockTillOptions = [
      { id: 11, name: "Local Free Till", node_id: 9, terminal_id: null },
      { id: 12, name: "Local Taken Till", node_id: 9, terminal_id: 7 },
      { id: 13, name: "Ancestor Free Till", node_id: 5, terminal_id: null },
    ];

    render(<TerminalSwitchTill terminalId={7} nodeId={9} open onClose={() => undefined} />);

    expect(screen.getByText("Local Free Till")).toBeTruthy();
    expect(screen.queryByText("Local Taken Till")).toBeNull();
    expect(screen.queryByText("Ancestor Free Till")).toBeNull();
  });
});
