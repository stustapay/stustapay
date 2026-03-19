import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

let mockedLanguage = "de-DE";
let mockedSelectedNode: string | null = null;

jest.mock("@/api", () => {
  const root = {
    id: 1,
    name: "Root",
    children: [
      {
        id: 42,
        name: "Test Event",
        event: {},
        event_node_id: 42,
        children: [],
      },
    ],
  };

  const findNode = (nodeId: number, node: typeof root): typeof root | undefined => {
    if (node.id === nodeId) {
      return node;
    }

    for (const child of node.children) {
      const found = findNode(nodeId, child);
      if (found) {
        return found;
      }
    }

    return undefined;
  };

  return {
    useNodeTree: () => ({ root }),
    findNode,
  };
});

jest.mock("@/store", () => ({
  selectSelectedNodes: "selectSelectedNodes",
  useAppSelector: () => mockedSelectedNode,
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "help.title": mockedLanguage.startsWith("de") ? "Bedienungsanleitung" : "Admin Guide",
        "help.intro": mockedLanguage.startsWith("de") ? "DE intro" : "EN intro",
        "help.contents": mockedLanguage.startsWith("de") ? "Inhaltsverzeichnis" : "Contents",
        "help.relatedLinks": mockedLanguage.startsWith("de") ? "Passende Portal-Links" : "Relevant portal links",
        "help.selectNodeHint": mockedLanguage.startsWith("de")
          ? "Aktuell ist kein Event-Kontext aktiv."
          : "No event context is active right now.",
        "help.requiresNodeContext": mockedLanguage.startsWith("de")
          ? "Verfügbar, sobald ein Event oder Knoten ausgewählt ist."
          : "Available after selecting an event or node.",
        "help.currentContext": `Current context: ${String(options?.node ?? "")}`,
      };

      return translations[key] ?? key;
    },
    i18n: {
      language: mockedLanguage,
      resolvedLanguage: mockedLanguage,
    },
  }),
}));

const { MemoryRouter } = require("react-router-dom");
const { HelpPage } = require("./HelpPage");

describe("HelpPage", () => {
  beforeEach(() => {
    mockedLanguage = "de-DE";
    mockedSelectedNode = null;
  });

  test("renders German content, anchors, and node-aware links", () => {
    render(
      <MemoryRouter initialEntries={["/help?nodeId=42"]}>
        <HelpPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Bedienungsanleitung" })).toBeTruthy();
    expect(screen.getAllByText("Einstieg und Navigation")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Einstieg und Navigation" }).length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Aktuelles Event öffnen" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("falls back to English and shows disabled node links without context", () => {
    mockedLanguage = "en-US";

    render(
      <MemoryRouter initialEntries={["/help"]}>
        <HelpPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Admin Guide" })).toBeTruthy();
    expect(screen.getAllByText("Getting started and navigation")).toHaveLength(2);
    expect(screen.getAllByText("Available after selecting an event or node.").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Open current event" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
