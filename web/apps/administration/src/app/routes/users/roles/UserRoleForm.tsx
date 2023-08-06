import { NewUserRole } from "@/api";
import { PrivilegeSelect } from "@/components/features";
import { Checkbox, FormControlLabel, TextField } from "@mui/material";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type UserRoleFormProps<T extends NewUserRole> = FormikProps<T>;

export function UserRoleForm<T extends NewUserRole>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: UserRoleFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("userRole.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />
      <FormControlLabel
        label={t("userRole.isPrivileged")}
        control={
          <Checkbox
            checked={values.is_privileged}
            onChange={(evt) => setFieldValue("is_privileged", evt.target.checked)}
          />
        }
      />

      <PrivilegeSelect
        label={t("userRole.privileges")}
        variant="standard"
        margin="normal"
        value={values.privileges}
        onChange={(val) => setFieldValue("privileges", val)}
        error={touched.privileges && !!errors.privileges}
        helperText={(touched.privileges && errors.privileges) as string}
      />
    </>
  );
}
