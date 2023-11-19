import { UserRole, selectUserRoleAll, useListUserRolesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

export type RoleSelectProps = { value: number; onChange: (roleId: number) => void } & Omit<
  SelectProps<UserRole, false>,
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
    (role: UserRole | null) => {
      if (role != null) {
        onChange(role.id);
      }
    },
    [onChange]
  );

  const selected = React.useMemo(() => roles.find((r) => r.id === value) ?? null, [roles, value]);

  return (
    <Select
      multiple={false}
      value={selected}
      onChange={handleChange}
      options={roles}
      formatOption={(role: UserRole) => role.name}
      {...props}
    />
  );
};
