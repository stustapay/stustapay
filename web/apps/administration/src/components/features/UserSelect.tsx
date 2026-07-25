import { Select, SelectProps } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { EventPrivilege, NodePrivilege, User } from "@/api";
import { getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type UserSelectProps = {
  value: number;
  onChange: (userId: number) => void;
  filterPrivilege?: EventPrivilege | NodePrivilege;
} & Omit<SelectProps<User, false>, "options" | "formatOption" | "multiple" | "value" | "onChange">;

export const UserSelect: React.FC<UserSelectProps> = ({ value, onChange, filterPrivilege, ...props }) => {
  const { currentNode } = useCurrentNode();
  const { data: users = [] } = useLiveQuery(
    (q) => q.from({ users: getUserCollection(currentNode.id, { filterPrivilege }) }),
    [currentNode.id, filterPrivilege]
  );

  const handleChange = React.useCallback(
    (user: User | null) => {
      if (user != null) {
        onChange(user.id);
      }
    },
    [onChange]
  );

  const selectedUser = React.useMemo(() => {
    return users.find((u) => u.id === value) ?? null;
  }, [value, users]);

  return (
    <Select
      multiple={false}
      value={selectedUser}
      options={users}
      formatOption={getUserName}
      onChange={handleChange}
      {...props}
    />
  );
};
