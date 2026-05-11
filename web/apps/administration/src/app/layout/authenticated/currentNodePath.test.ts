import { NodeSeenByUser } from "@/api";
import { getCurrentNodePath } from "./currentNodePath";

const tree: NodeSeenByUser = {
  id: 1,
  name: "Festival",
  parent_ids: [],
  children: [
    {
      id: 2,
      name: "Bar 1",
      parent_ids: [1],
      children: [
        {
          id: 3,
          name: "Ausschank Nord",
          parent_ids: [1, 2],
          children: [],
        },
      ],
    },
  ],
} as NodeSeenByUser;

describe("getCurrentNodePath", () => {
  test("returns the root name for a root node route", () => {
    expect(getCurrentNodePath(tree, 1)).toEqual(["Festival"]);
  });

  test("returns the full parent path for a subnode route", () => {
    expect(getCurrentNodePath(tree, 3)).toEqual(["Festival", "Bar 1", "Ausschank Nord"]);
  });

  test("returns null when no node is selected", () => {
    expect(getCurrentNodePath(tree, null)).toBeNull();
  });

  test("returns null for an unknown node id", () => {
    expect(getCurrentNodePath(tree, 999)).toBeNull();
  });
});
