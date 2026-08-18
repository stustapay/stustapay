import { renderHook } from "@testing-library/react";

import { useThemeColors } from "./useThemeColors";

let mockPublicConfig: { font_color?: string | null } = {};

jest.mock("./usePublicConfig", () => ({
  usePublicConfig: () => mockPublicConfig,
}));

describe("useThemeColors", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--portal-font-color");
  });

  test("uses the configured font color", () => {
    mockPublicConfig = { font_color: "#101010" };

    renderHook(() => useThemeColors());

    expect(document.documentElement.style.getPropertyValue("--portal-font-color")).toBe("#101010");
  });

  test("falls back to white when no font color is configured", () => {
    mockPublicConfig = { font_color: null };

    renderHook(() => useThemeColors());

    expect(document.documentElement.style.getPropertyValue("--portal-font-color")).toBe("white");
  });
});
