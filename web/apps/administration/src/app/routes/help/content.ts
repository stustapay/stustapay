import { helpContentDe } from "./content.de";
import { helpContentEn } from "./content.en";
import type { HelpContent } from "./types";

export type { HelpContent, HelpLink, HelpSection } from "./types";
export { helpLinkTargets } from "./targets";

export const getHelpContent = (language: string): HelpContent => {
  if (language.toLowerCase().startsWith("de")) {
    return helpContentDe;
  }
  return helpContentEn;
};
