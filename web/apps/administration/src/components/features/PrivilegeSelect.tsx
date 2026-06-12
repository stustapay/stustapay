import { Select, SelectProps } from "@stustapay/components";
import { EventPrivilege, EventPrivilegeSchema, NodePrivilege, NodePrivilegeSchema } from "@stustapay/models";
import * as React from "react";

export type EventPrivilegeSelectProps = Omit<
  SelectProps<EventPrivilege, true>,
  "options" | "formatOption" | "multiple"
>;

export const EventPrivilegeSelect: React.FC<EventPrivilegeSelectProps> = (props) => {
  return (
    <Select
      multiple={true}
      checkboxes={true}
      chips={true}
      options={EventPrivilegeSchema.options}
      formatOption={(privilege: EventPrivilege) => privilege}
      {...props}
    />
  );
};

export type NodePrivilegeSelectProps = Omit<SelectProps<NodePrivilege, true>, "options" | "formatOption" | "multiple">;

export const NodePrivilegeSelect: React.FC<NodePrivilegeSelectProps> = (props) => {
  return (
    <Select
      multiple={true}
      checkboxes={true}
      chips={true}
      options={NodePrivilegeSchema.options}
      formatOption={(privilege: NodePrivilege) => privilege}
      {...props}
    />
  );
};
