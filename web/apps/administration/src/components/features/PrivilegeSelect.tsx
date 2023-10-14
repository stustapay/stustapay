import { Select, SelectProps } from "@stustapay/components";
import { Privilege, PrivilegeSchema } from "@stustapay/models";
import * as React from "react";

export type PrivilegeSelectProps = Omit<
  SelectProps<Privilege, Privilege, true>,
  "options" | "formatOption" | "multiple" | "getOptionKey"
>;

export const PrivilegeSelect: React.FC<PrivilegeSelectProps> = (props) => {
  return (
    <Select
      multiple={true}
      checkboxes={true}
      chips={true}
      options={PrivilegeSchema.options}
      getOptionKey={(privilege: Privilege) => privilege}
      formatOption={(privilege: Privilege) => privilege}
      {...props}
    />
  );
};
