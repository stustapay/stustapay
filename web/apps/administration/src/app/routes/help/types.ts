export interface HelpLink {
  label: string;
  description?: string;
  to?: string;
  buildTo?: (nodeId: number) => string;
  requiresNodeContext?: boolean;
  context?: "current" | "event";
}

export interface HelpSection {
  id: string;
  title: string;
  summary?: string;
  body: string;
  links: HelpLink[];
}

export interface HelpContent {
  sections: HelpSection[];
}
