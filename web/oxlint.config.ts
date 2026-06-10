import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "react", "react-perf", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },
  rules: {
    "import/no-unassigned-import": "off",
    "import/no-named-as-default": "off",
    "react-perf/jsx-no-new-object-as-prop": "off",
    "react-perf/jsx-no-new-function-as-prop": "off",
    "react-perf/jsx-no-new-array-as-prop": "off",
    "react-perf/jsx-no-jsx-as-prop": "off",
    "react/no-unstable-nested-components": "off",
    "react/no-array-index-key": "off",
    "react/jsx-key": "off",
    "react/react-in-jsx-scope": "off",
    "eslint/no-shadow": "off",
    "vitest/expect-expect": "off",
  },
});
