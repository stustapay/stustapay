import { Checkbox, ListItemText } from "@mui/material";
import { Select, SelectProps } from "@stustapay/components";
import { EventPrivilege, EventPrivilegeSchema, NodePrivilege, NodePrivilegeSchema } from "@stustapay/models";
import * as React from "react";

import { usePrivilegeTranslations } from "@/hooks";

type PrivilegeSelectProps<P extends EventPrivilege | NodePrivilege> = Omit<
  SelectProps<P, true>,
  "options" | "formatOption" | "multiple" | "renderOption"
> & {
  options: readonly P[];
};

function PrivilegeSelect<P extends EventPrivilege | NodePrivilege>({
  options,
  value,
  error,
  helperText,
  ...props
}: PrivilegeSelectProps<P>) {
  const { getPrivilegeName, getPrivilegeDescription } = usePrivilegeTranslations();

  const renderOption = React.useCallback(
    (liProps: React.HTMLAttributes<HTMLLIElement>, option: P, { selected }: { selected: boolean }) => (
      <li {...liProps} key={option}>
        <Checkbox checked={selected} />
        <ListItemText primary={getPrivilegeName(option)} secondary={getPrivilegeDescription(option)} />
      </li>
    ),
    [getPrivilegeDescription, getPrivilegeName]
  );

  const formatOption = React.useCallback((privilege: P) => getPrivilegeName(privilege), [getPrivilegeName]);

  return (
    <Select
      multiple={true}
      checkboxes={true}
      chips={true}
      options={[...options]}
      formatOption={formatOption as SelectProps<P, true>["formatOption"]}
      renderOption={renderOption}
      value={value}
      error={error}
      helperText={helperText}
      {...props}
    />
  );
}

export type EventPrivilegeSelectProps = Omit<PrivilegeSelectProps<EventPrivilege>, "options">;

export const EventPrivilegeSelect: React.FC<EventPrivilegeSelectProps> = (props) => {
  return <PrivilegeSelect options={EventPrivilegeSchema.options} {...props} />;
};

export type NodePrivilegeSelectProps = Omit<PrivilegeSelectProps<NodePrivilege>, "options">;

export const NodePrivilegeSelect: React.FC<NodePrivilegeSelectProps> = (props) => {
  return <PrivilegeSelect options={NodePrivilegeSchema.options} {...props} />;
};
