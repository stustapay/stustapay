import { parseNodeId, resolveHelpContextNodeId } from "./context";

describe("help context resolution", () => {
  test("prefers the explicit query node id", () => {
    expect(
      resolveHelpContextNodeId({
        pathname: "/node/12/products",
        selectedNode: "/node/7/users",
        queryNodeId: "42",
      })
    ).toBe(42);
  });

  test("falls back to the current path", () => {
    expect(
      resolveHelpContextNodeId({
        pathname: "/node/12/products",
        selectedNode: "/node/7/users",
      })
    ).toBe(12);
  });

  test("falls back to the selected navigation node", () => {
    expect(
      resolveHelpContextNodeId({
        pathname: "/help",
        selectedNode: "/node/7/users",
      })
    ).toBe(7);
  });

  test("returns null when no valid node context exists", () => {
    expect(resolveHelpContextNodeId({ pathname: "/help", selectedNode: "/profile" })).toBeNull();
    expect(parseNodeId("0")).toBeNull();
    expect(parseNodeId("abc")).toBeNull();
  });
});
