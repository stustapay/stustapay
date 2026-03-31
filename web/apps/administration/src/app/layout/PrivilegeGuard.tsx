import { PrivilegeRequirement } from "@/core/privileges";
import { useCurrentUserHasPrivilege } from "@/hooks";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

export interface PrivilegeGuardProps {
  privilege: PrivilegeRequirement;
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
