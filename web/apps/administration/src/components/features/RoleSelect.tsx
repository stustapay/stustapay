import { Select, SelectProps } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { UserRole } from "@/api";
import { getUserRoleCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type RoleSelectProps = { value: number[]; onChange: (roleIds: number[]) => void } & Omit<
  SelectProps<UserRole, true>,
  "options" | "formatOption" | "multiple" | "value" | "onChange"
>;

export const RoleSelect: React.FC<RoleSelectProps> = ({ value, onChange, ...props }) => {
  const { currentNode } = useCurrentNode();
  const { data: roles = [] } = useLiveQuery(
    (q) => q.from({ userRoles: getUserRoleCollection(currentNode.id) }),
    [currentNode.id]
  );

  const handleChange = React.useCallback(
    (selectedRoles: UserRole[] | null) => {
      if (selectedRoles != null) {
        onChange(selectedRoles.map((r) => r.id));
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
