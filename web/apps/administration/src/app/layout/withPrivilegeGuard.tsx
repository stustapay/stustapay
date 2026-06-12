import * as React from "react";

import { EventPrivilege, NodePrivilege } from "@/api";

import { PrivilegeGuard } from "./PrivilegeGuard";

export function withPrivilegeGuard<P>(privilege: EventPrivilege | NodePrivilege, Component: React.FC<P>): React.FC<P> {
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
