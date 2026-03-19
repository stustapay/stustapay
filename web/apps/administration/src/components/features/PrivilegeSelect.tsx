import { Select, SelectProps } from "@stustapay/components";
import { Privilege, PrivilegeSchema } from "@stustapay/models";
import * as React from "react";

export type PrivilegeSelectProps = Omit<SelectProps<Privilege, true>, "options" | "formatOption" | "multiple"> & {
  options?: Privilege[];
};

export const PrivilegeSelect: React.FC<PrivilegeSelectProps> = ({ options = PrivilegeSchema.options, ...props }) => {
  return (
    <Select
      multiple={true}
      checkboxes={true}
      chips={true}
      options={options}
      formatOption={(privilege: Privilege) => privilege}
      {...props}
    />
  );
};
