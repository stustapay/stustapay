import "i18next";
import { defaultNS, resources } from "./i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNs: typeof defaultNS;
    resources: (typeof resources)["en"];
  }
}
