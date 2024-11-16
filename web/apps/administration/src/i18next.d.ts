import "i18next";
import { defaultNS } from "./i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNs: typeof defaultNS;
    resources: (typeof resources)["en"];
  }
}
