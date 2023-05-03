import { selectCurrentUser, useAppSelector } from "@store";
import { Privilege } from "@stustapay/models";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

export interface PrivilegeGuardProps {
  privilege: Privilege;
}

export const PrivilegeGuard: React.FC<PrivilegeGuardProps> = ({ privilege }) => {
  const user = useAppSelector(selectCurrentUser);

  if (!user || !user.privileges.includes(privilege)) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};
