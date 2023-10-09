import { UserRole, selectUserRoleAll, useListUserRolesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type RoleSelectProps = Omit<
  SelectProps<UserRole, string, true>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const RoleSelect: React.FC<RoleSelectProps> = (props) => {
  const { currentNode } = useCurrentNode();
  const { roles } = useListUserRolesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        roles: data ? selectUserRoleAll(data) : [],
      }),
    }
  );

  return (
    <Select
      multiple={true}
      chips={true}
      checkboxes={true}
      options={roles}
      getOptionKey={(role: UserRole) => role.name}
      formatOption={(role: UserRole) => role.name}
      {...props}
    />
  );
};
