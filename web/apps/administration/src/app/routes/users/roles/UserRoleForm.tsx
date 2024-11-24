import { NewUserRole } from "@/api";
import { PrivilegeSelect } from "@/components/features";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { FormCheckbox, FormTextField } from "@stustapay/form-components";

export type UserRoleFormProps<T extends NewUserRole> = FormikProps<T>;

export function UserRoleForm<T extends NewUserRole>(props: UserRoleFormProps<T>) {
  const { t } = useTranslation();
  const { values, setFieldValue, touched, errors } = props;
  return (
    <>
      <FormTextField autoFocus name="name" label={t("userRole.name")} formik={props} />
      <FormCheckbox label={t("userRole.isPrivileged")} name="is_privileged" formik={props} />

      <PrivilegeSelect
        label={t("userRole.privileges")}
        value={values.privileges}
        onChange={(val) => setFieldValue("privileges", val)}
        error={touched.privileges && !!errors.privileges}
        helperText={(touched.privileges && errors.privileges) as string}
      />
    </>
  );
}
