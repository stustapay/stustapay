import { getNodeIdFromPath } from "@/app/routes";

export interface HelpContextInput {
  pathname?: string | null;
  selectedNode?: string | null;
  queryNodeId?: string | number | null;
}

export const parseNodeId = (value?: string | number | null): number | null => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const resolveHelpContextNodeId = ({ pathname, selectedNode, queryNodeId }: HelpContextInput): number | null => {
  return parseNodeId(queryNodeId) ?? getNodeIdFromPath(pathname) ?? getNodeIdFromPath(selectedNode);
};
