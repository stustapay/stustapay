import * as React from "react";
import { PrivilegeRequirement } from "@/core/privileges";
import { PrivilegeGuard } from "./PrivilegeGuard";

export function withPrivilegeGuard<P>(privilege: PrivilegeRequirement, Component: React.FC<P>): React.FC<P> {
  const Wrapper: React.FC<P> = (props) => {
    return (
      <PrivilegeGuard privilege={privilege}>
        <Component {...(props as any)} />
      </PrivilegeGuard>
    );
  };
  Wrapper.displayName = `guarded${Component.displayName}`;
  return Wrapper;
}
