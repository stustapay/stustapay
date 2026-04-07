import { hasAnyPrivilege } from "@/core/privileges";
import { OrderRoutes } from "./routes";

describe("OrderRoutes", () => {
  test("accepts can_book_orders for order access", () => {
    expect(hasAnyPrivilege(["can_book_orders"], OrderRoutes.privilege)).toBe(true);
  });

  test("accepts node_administration for order access", () => {
    expect(hasAnyPrivilege(["node_administration"], OrderRoutes.privilege)).toBe(true);
  });
});
