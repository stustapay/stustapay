import { useLogoutMutation } from "@/api";
import { Loading } from "@stustapay/components";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import * as React from "react";
import { Navigate } from "react-router-dom";

export const Logout: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [logout] = useLogoutMutation();

  React.useEffect(() => {
    if (isAuthenticated) {
      logout()
        .unwrap()
        .catch((err) => console.error("error during logout", err));
    }
  }, [isAuthenticated, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Loading />;
};
