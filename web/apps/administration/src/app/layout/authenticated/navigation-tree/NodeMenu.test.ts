import { TextDecoder, TextEncoder } from "util";

(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextEncoder =
  TextEncoder;
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

jest.mock("@/i18n", () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

import { NodeSeenByUser } from "@/api";
const { isMenuEntryValidAtNode, nodeMenuEntryDefinitions } = require("./NodeMenu");

const createNode = (privileges_at_node: string[]): NodeSeenByUser =>
  ({
    id: 7,
    name: "Test Node",
    children: [],
    parent_ids: [],
    read_only: false,
    event: {},
    event_node_id: 7,
    privileges_at_node,
    computed_forbidden_objects_at_node: [],
  }) as NodeSeenByUser;

const findEntryByRoute = (path: string) => {
  const node = createNode(["node_administration", "user_management", "entry_management"]);
  const entry = nodeMenuEntryDefinitions.find((menuEntry) => menuEntry.route(node) === path);

  if (entry == null) {
    throw new Error(`Could not find menu entry for route ${path}`);
  }

  return entry;
};

describe("isMenuEntryValidAtNode", () => {
  test("hides terminal and till entries without node administration access", () => {
    const node = createNode([]);

    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/terminals"), node)).toBe(false);
    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/tills"), node)).toBe(false);
  });

  test("shows payouts entry for payout management or node administration", () => {
    const payoutManagerNode = createNode(["payout_management"]);
    const nodeAdminNode = createNode(["node_administration"]);
    const entry = findEntryByRoute("/node/7/payout-runs");

    expect(isMenuEntryValidAtNode(entry, payoutManagerNode)).toBe(true);
    expect(isMenuEntryValidAtNode(entry, nodeAdminNode)).toBe(true);
  });

  test("hides payouts entry without payout privileges", () => {
    const node = createNode(["view_node_stats"]);

    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/payout-runs"), node)).toBe(false);
  });

  test("shows users entry when user management is granted", () => {
    const node = createNode(["user_management"]);

    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/users"), node)).toBe(true);
  });

  test("shows entry management entry when entry management is granted", () => {
    const node = createNode(["entry_management"]);

    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/entry/areas"), node)).toBe(true);
  });

  test("shows customers entry when customer management is granted", () => {
    const node = createNode(["customer_management"]);

    expect(isMenuEntryValidAtNode(findEntryByRoute("/node/7/customers"), node)).toBe(true);
  });
});
