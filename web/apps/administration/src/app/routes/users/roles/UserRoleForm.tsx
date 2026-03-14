import { NewUserRole } from "@/api";
import { PrivilegeSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { Privilege, PrivilegeSchema } from "@stustapay/models";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { FormCheckbox, FormTextField } from "@stustapay/form-components";

export type UserRoleFormProps<T extends NewUserRole> = FormikProps<T>;

export function UserRoleForm<T extends NewUserRole>(props: UserRoleFormProps<T>) {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { values, setFieldValue, touched, errors } = props;
  const roleNodeId = (values as { node_id?: number }).node_id;
  const availablePrivileges = React.useMemo(
    () =>
      currentNode.id === 0 || roleNodeId === 0
        ? PrivilegeSchema.options
        : PrivilegeSchema.options.filter((privilege) => privilege !== Privilege.global_email_management),
    [currentNode.id, roleNodeId]
  );

  return (
    <>
      <FormTextField autoFocus name="name" label={t("userRole.name")} formik={props} />
      <FormCheckbox label={t("userRole.isPrivileged")} name="is_privileged" formik={props} />

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
