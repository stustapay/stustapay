// import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config = {
  schemaFile: "../../../api/customer_portal.json",
  apiFile: "./src/api/generated/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./src/api/generated/api.ts",
  exportName: "api",
  tag: true,
  hooks: true,
};

// export default config;
module.exports = config;
