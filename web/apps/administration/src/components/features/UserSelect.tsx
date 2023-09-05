import { selectUserAll, useListUsersQuery } from "@api";
import { useCurrentNode } from "@hooks";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
} from "@mui/material";
import { getUserName } from "@stustapay/models";
import * as React from "react";

export interface UserSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value: number | null;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  filterRole?: string;
  onChange: (userId: number) => void;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  filterRole,
  ...props
}) => {
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

  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    const newVal = evt.target.value;
    onChange(Number(newVal));
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="userSelectLabel">
        {label}
      </InputLabel>
      <Select labelId="userSelectLabel" value={value ?? ""} onChange={handleChange} {...props}>
        {filteredUsers.map((user) => (
          <MenuItem key={user.id} value={user.id}>
            {getUserName(user)}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
