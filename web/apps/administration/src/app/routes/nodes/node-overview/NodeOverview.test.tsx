import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseCurrentNode = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();
const mockUseGenerateRevenueReportMutation = jest.fn();

jest.mock("@/hooks", () => ({
  useCurrentNode: () => mockUseCurrentNode(),
  useCurrentUserHasPrivilege: (...args: unknown[]) => mockUseCurrentUserHasPrivilege(...args),
}));

jest.mock("@/api", () => ({
  Privilege: {
    node_administration: "node_administration",
    view_node_stats: "view_node_stats",
  },
  useGenerateRevenueReportMutation: () => mockUseGenerateRevenueReportMutation(),
}));

jest.mock("../event-overview", () => ({
  EventOverview: () => <div>event-overview</div>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { MemoryRouter, Route, Routes } = require("react-router-dom");
const { NodeOverview } = require("./NodeOverview");

describe("NodeOverview", () => {
  beforeEach(() => {
    mockUseCurrentNode.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();
    mockUseGenerateRevenueReportMutation.mockReset();
    mockUseGenerateRevenueReportMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  test("redirects stats viewers without node administration to node stats in event context", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 5,
        event: {},
        event_node_id: 5,
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "view_node_stats");

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <Routes>
          <Route path="/node/:nodeId" element={<NodeOverview />} />
          <Route path="/node/:nodeId/stats" element={<div>node-stats</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("node-stats")).toBeTruthy();
  });

  test("keeps the event overview visible for node administrators", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 5,
        event: {},
        event_node_id: 5,
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "node_administration");

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    expect(screen.getByText("event-overview")).toBeTruthy();
  });

  test("hides the revenue report button without node administration outside event context", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 9,
        event: null,
        event_node_id: null,
      },
    });
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/node/9"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: "overview.generateRevenueReport" })).toBeNull();
  });
});
