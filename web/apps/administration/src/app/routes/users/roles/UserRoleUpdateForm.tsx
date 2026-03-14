import { PrivilegeSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { FormCheckbox } from "@stustapay/form-components";
import { Privilege, PrivilegeSchema } from "@stustapay/models";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export const UserRoleUpdateSchema = z.object({
  id: z.number(),
  is_privileged: z.boolean(),
  privileges: z.array(PrivilegeSchema),
});

export type UserRoleUpdate = z.infer<typeof UserRoleUpdateSchema>;

export type UserRoleUpdateFormProps<T extends UserRoleUpdate> = FormikProps<T>;

export function UserRoleUpdateForm<T extends UserRoleUpdate>(props: UserRoleUpdateFormProps<T>) {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { values, touched, errors, setFieldValue } = props;
  const availablePrivileges = React.useMemo(
    () =>
      currentNode.id === 0
        ? PrivilegeSchema.options
        : PrivilegeSchema.options.filter((privilege) => privilege !== Privilege.global_email_management),
    [currentNode.id]
  );

  return (
    <>
      <FormCheckbox name="is_privileged" label={t("userRole.isPrivileged")} formik={props} />

      <PrivilegeSelect
        options={availablePrivileges}
        label={t("userRole.privileges")}
        value={values.privileges}
        onChange={(val) => setFieldValue("privileges", val)}
        error={touched.privileges && !!errors.privileges}
        helperText={(touched.privileges && errors.privileges) as string}
      />
    </>
  );
}
