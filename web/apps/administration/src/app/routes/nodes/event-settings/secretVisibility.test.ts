import { hasSecretValue } from "./secretVisibility";

describe("hasSecretValue", () => {
  test("detects configured secrets", () => {
    expect(hasSecretValue("refresh-token-123")).toBe(true);
  });

  test("detects missing secrets", () => {
    expect(hasSecretValue("")).toBe(false);
    expect(hasSecretValue(null)).toBe(false);
    expect(hasSecretValue(undefined)).toBe(false);
  });
});
