import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

const mockUseCurrentNode = jest.fn();
const mockUseCurrentUserHasPrivilege = jest.fn();
const mockUseGenerateRevenueReportMutation = jest.fn();
const mockGenerateRevenueReport = jest.fn();
const mockToastError = jest.fn();

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

jest.mock("react-toastify", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const { MemoryRouter, Route, Routes } = require("react-router-dom");
const { NodeOverview } = require("./NodeOverview");

describe("NodeOverview", () => {
  beforeEach(() => {
    mockUseCurrentNode.mockReset();
    mockUseCurrentUserHasPrivilege.mockReset();
    mockUseGenerateRevenueReportMutation.mockReset();
    mockGenerateRevenueReport.mockReset();
    mockToastError.mockReset();
    mockUseGenerateRevenueReportMutation.mockReturnValue([mockGenerateRevenueReport, { isLoading: false }]);
  });

  test("redirects stats viewers without node administration to node stats in event context", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 5,
        name: "Event",
        event: {},
        event_node_id: 5,
        privileges_at_node: ["view_node_stats"],
        children: [],
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
        name: "Event",
        event: {},
        event_node_id: 5,
        privileges_at_node: ["node_administration"],
        children: [],
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "node_administration");

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    expect(screen.getByText("event-overview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "overview.generateRevenueReport" })).toBeTruthy();
  });

  test("hides the revenue report button for an administrator outside event context", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 9,
        name: "Root",
        event: null,
        event_node_id: null,
        privileges_at_node: ["node_administration"],
        children: [],
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "node_administration");

    render(
      <MemoryRouter initialEntries={["/node/9"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: "overview.generateRevenueReport" })).toBeNull();
  });

  test("downloads the revenue report for an administered sub-node", async () => {
    const revokeObjectUrl = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    mockGenerateRevenueReport.mockReturnValue({ unwrap: jest.fn().mockResolvedValue("blob:revenue-report") });
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 9,
        name: "Bar",
        event: null,
        event_node_id: 5,
        privileges_at_node: ["node_administration"],
        children: [],
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "node_administration");

    render(
      <MemoryRouter initialEntries={["/node/9"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "overview.generateRevenueReport" }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(mockGenerateRevenueReport).toHaveBeenCalledWith({ nodeId: 9 });
    expect(click.mock.instances[0].getAttribute("href")).toBe("blob:revenue-report");
    expect(click.mock.instances[0].getAttribute("download")).toBe("revenue_report_9.pdf");
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith("blob:revenue-report"));
    click.mockRestore();
  });

  test("shows an error when revenue report generation fails", async () => {
    mockGenerateRevenueReport.mockReturnValue({ unwrap: jest.fn().mockRejectedValue(new Error("failed")) });
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 9,
        name: "Bar",
        event: null,
        event_node_id: 5,
        privileges_at_node: ["node_administration"],
        children: [],
      },
    });
    mockUseCurrentUserHasPrivilege.mockImplementation((privilege: string) => privilege === "node_administration");

    render(
      <MemoryRouter initialEntries={["/node/9"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "overview.generateRevenueReport" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("overview.generateRevenueReportError"));
  });

  test("redirects scoped event-root users to the only actionable descendant", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 5,
        name: "Event",
        event: {},
        event_node_id: 5,
        privileges_at_node: [],
        children: [
          {
            id: 9,
            name: "Bar",
            privileges_at_node: ["view_node_stats"],
            children: [],
          },
        ],
      },
    });
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <Routes>
          <Route path="/node/:nodeId" element={<NodeOverview />} />
          <Route path="/node/9/stats" element={<div>child-node-stats</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("child-node-stats")).toBeTruthy();
    expect(screen.queryByText("event-overview")).toBeNull();
  });

  test("keeps scoped event-root users on the root page when multiple actionable descendants exist", () => {
    mockUseCurrentNode.mockReturnValue({
      currentNode: {
        id: 5,
        name: "Event",
        event: {},
        event_node_id: 5,
        privileges_at_node: [],
        children: [
          {
            id: 9,
            name: "Bar",
            privileges_at_node: ["view_node_stats"],
            children: [],
          },
          {
            id: 11,
            name: "Kitchen",
            privileges_at_node: ["node_administration"],
            children: [],
          },
        ],
      },
    });
    mockUseCurrentUserHasPrivilege.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/node/5"]}>
        <NodeOverview />
      </MemoryRouter>
    );

    expect(screen.getByText("overview.scopedOverviewUnavailable")).toBeTruthy();
    expect(screen.getByText("overview.openAccessibleSubnode")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kitchen" })).toBeTruthy();
    expect(screen.queryByText("event-overview")).toBeNull();
  });
});
