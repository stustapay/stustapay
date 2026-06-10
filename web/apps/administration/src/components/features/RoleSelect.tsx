import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

import { UserRole, selectUserRoleAll, useListUserRolesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";

export type RoleSelectProps = { value: number[]; onChange: (roleIds: number[]) => void } & Omit<
  SelectProps<UserRole, true>,
  "options" | "formatOption" | "multiple" | "value" | "onChange"
>;

export const RoleSelect: React.FC<RoleSelectProps> = ({ value, onChange, ...props }) => {
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

  const handleChange = React.useCallback(
    (roles: UserRole[] | null) => {
      if (roles != null) {
        onChange(roles.map((r) => r.id));
      }
    },
    [onChange]
  );

  const selected = React.useMemo(() => {
    const list = roles.filter((r) => value.includes(r.id));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [roles, value]);

  return (
    <Select
      multiple={true}
      value={selected}
      onChange={handleChange}
      options={roles}
      formatOption={(role: UserRole) => role.name}
      {...props}
    />
  );
};
