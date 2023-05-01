import * as React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAppSelector, selectCurrentUser } from "@store";
import { PrivilegeAdmin } from "@stustapay/models";

export const AdminRoot: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);

  if (!user || !user.privileges.includes(PrivilegeAdmin)) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};
