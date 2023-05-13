import { selectCurrentUser, useAppSelector } from "@store";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

export interface PrivilegeGuardProps {
  privilege: Privilege;
  children?: React.ReactNode;
}

export const PrivilegeGuard: React.FC<PrivilegeGuardProps> = ({ privilege, children }) => {
  const user = useAppSelector(selectCurrentUser);

  if (!user || !user.privileges.includes(privilege)) {
    return <Navigate to="/" />;
  }

  // TODO: figure out why this cast is needed
  return children ? (children as React.ReactElement) : <Outlet />;
};
