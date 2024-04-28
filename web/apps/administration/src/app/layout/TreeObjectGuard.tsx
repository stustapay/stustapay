import { ObjectType } from "@/api";
import { useCurrentNodeAllowsObject } from "@/hooks";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";

export interface TreeObjectGuardProps {
  objectType: ObjectType;

  /*
   * whether to hide children instead of redirecting to the root route
   * default is redirect
   */
  hideChildren?: boolean;
  children?: React.ReactNode;
}

export const TreeObjectGuard: React.FC<TreeObjectGuardProps> = ({ objectType, children, hideChildren = false }) => {
  const isAllowed = useCurrentNodeAllowsObject(objectType);

  if (hideChildren && !isAllowed) {
    return null;
  }

  if (!hideChildren && !isAllowed) {
    return <Navigate to="/" />;
  }

  // TODO: figure out why this cast is needed
  return children ? (children as React.ReactElement) : <Outlet />;
};
