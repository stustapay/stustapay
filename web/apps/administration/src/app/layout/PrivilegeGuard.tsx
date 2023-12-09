import { Privilege } from "@/api";
import { useCurrentUserHasPrivilege } from "@/hooks";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

export interface PrivilegeGuardProps {
  privilege: Privilege;
  children?: React.ReactNode;
}

export const PrivilegeGuard: React.FC<PrivilegeGuardProps> = ({ privilege, children }) => {
  const hasPrivilege = useCurrentUserHasPrivilege(privilege);

  if (!hasPrivilege) {
    return <Navigate to="/" />;
  }

  // TODO: figure out why this cast is needed
  return children ? (children as React.ReactElement) : <Outlet />;
};
