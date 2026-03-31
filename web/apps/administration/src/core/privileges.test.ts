import { hasAllPrivileges, hasAnyPrivilege, normalizePrivilegeRequirement } from "./privileges";

describe("privilege helpers", () => {
  test("normalizes empty privilege requirements", () => {
    expect(normalizePrivilegeRequirement()).toEqual([]);
  });

  test("matches any privilege in an array requirement", () => {
    expect(hasAnyPrivilege(["payout_management"], ["node_administration", "payout_management"])).toBe(true);
    expect(hasAnyPrivilege(["node_administration"], ["node_administration", "payout_management"])).toBe(true);
    expect(hasAnyPrivilege(["view_node_stats"], ["node_administration", "payout_management"])).toBe(false);
  });

  test("keeps all-of semantics for full privilege requirements", () => {
    expect(hasAllPrivileges(["node_administration", "customer_management"], ["node_administration"])).toBe(true);
    expect(hasAllPrivileges(["node_administration"], ["node_administration", "customer_management"])).toBe(false);
  });
});
