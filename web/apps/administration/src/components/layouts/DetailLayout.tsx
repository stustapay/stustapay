import * as React from "react";
import { CommonActionLayout } from "./CommonActionLayout";
import { LayoutAction } from "./types";
import { IRouteBuilder } from "@/app/routes";
import { useCurrentUserHasPrivilege } from "@/hooks";

export interface DetailLayoutProps {
  title: string;
  routes?: IRouteBuilder;
  children?: React.ReactNode;
  actions?: LayoutAction[];
}

export const DetailLayout: React.FC<DetailLayoutProps> = ({ title, children, actions, routes }) => {
  const hasPrivilege = useCurrentUserHasPrivilege(routes?.privilege);

  const guardedActions = hasPrivilege ? actions : [];
  return (
    <CommonActionLayout title={title} actions={guardedActions}>
      {children}
    </CommonActionLayout>
  );
};
