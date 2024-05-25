import { Privilege, User, selectUserAll, useListUsersQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";

export type UserSelectProps = {
  value: number;
  onChange: (userId: number) => void;
  filterPrivilege?: Privilege;
} & Omit<SelectProps<User, false>, "options" | "formatOption" | "multiple" | "value" | "onChange">;

export const UserSelect: React.FC<UserSelectProps> = ({ value, onChange, filterPrivilege, ...props }) => {
  const { currentNode } = useCurrentNode();
  const { users } = useListUsersQuery(
    { nodeId: currentNode.id, filterPrivilege },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        users: data ? selectUserAll(data) : [],
      }),
    }
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
