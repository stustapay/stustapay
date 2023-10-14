import { User, selectUserAll, useListUsersQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select, SelectProps } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";

export type UserSelectProps = {
  filterRole?: string;
} & Omit<SelectProps<User, number, false>, "options" | "formatOption" | "multiple" | "getOptionKey">;

export const UserSelect: React.FC<UserSelectProps> = ({ filterRole, ...props }) => {
  const { currentNode } = useCurrentNode();
  const { users } = useListUsersQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        users: data ? selectUserAll(data) : [],
      }),
    }
  );

  const filteredUsers = React.useMemo(() => {
    if (!filterRole) {
      return users;
    }

    return users.filter((user) => user.role_names.includes(filterRole));
  }, [users, filterRole]);

  return (
    <Select
      multiple={false}
      options={filteredUsers}
      getOptionKey={(user: User) => user.id}
      formatOption={getUserName}
      {...props}
    />
  );
};
