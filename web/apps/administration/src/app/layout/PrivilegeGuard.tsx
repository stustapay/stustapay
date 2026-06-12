import { EventPrivilege, NodePrivilege } from "@stustapay/models";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useCurrentUserHasPrivilege } from "@/hooks";

export interface PrivilegeGuardProps {
  privilege: EventPrivilege | NodePrivilege;
  /*
   * whether to hide children instead of redirecting to the root route
   * default is redirect
   */
  hideChildren?: boolean;
  children?: React.ReactNode;
}

export const PrivilegeGuard: React.FC<PrivilegeGuardProps> = ({ privilege, children, hideChildren = false }) => {
  const hasPrivilege = useCurrentUserHasPrivilege(privilege);

  if (hideChildren && !hasPrivilege) {
    return null;
  }

  if (!hideChildren && !hasPrivilege) {
    return <Navigate to="/" />;
  }

  // TODO: figure out why this cast is needed
  return children ? (children as React.ReactElement) : <Outlet />;
};
