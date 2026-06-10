import * as React from "react";

import { IRouteBuilder } from "@/app/routes";
import { useCurrentUserHasPrivilege, useCurrentUserHasPrivilegeAtNode } from "@/hooks";

import { CommonActionLayout } from "../CommonActionLayout";
import { LayoutAction } from "../types";

export interface DetailLayoutProps {
  title: string;
  routes?: IRouteBuilder;
  children?: React.ReactNode;
  actions?: LayoutAction[];
  elementNodeId?: number;
}

export const DetailLayout: React.FC<DetailLayoutProps> = ({ title, children, actions, routes, elementNodeId }) => {
  const hasPrivilege = useCurrentUserHasPrivilege(routes?.privilege);
  const hasPrivilegeAtNodeGetter = useCurrentUserHasPrivilegeAtNode(routes?.privilege);
  const hasPrivilegeAtNode = React.useMemo(() => {
    if (elementNodeId == null) {
      return true;
    }
    return hasPrivilegeAtNodeGetter(elementNodeId);
  }, [hasPrivilegeAtNodeGetter, elementNodeId]);

  const guardedActions = hasPrivilege && hasPrivilegeAtNode ? actions : [];
  return (
    <CommonActionLayout title={title} actions={guardedActions}>
      {children}
    </CommonActionLayout>
  );
};
