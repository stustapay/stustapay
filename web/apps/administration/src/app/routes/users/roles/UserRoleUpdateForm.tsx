import { PrivilegeSelect } from "@/components/features";
import { Checkbox, FormControlLabel } from "@mui/material";
import { PrivilegeSchema } from "@stustapay/models";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export const UserRoleUpdateSchema = z.object({
  id: z.number(),
  is_privileged: z.boolean(),
  privileges: z.array(PrivilegeSchema),
});

export type UserRoleUpdate = z.infer<typeof UserRoleUpdateSchema>;

export type UserRoleUpdateFormProps<T extends UserRoleUpdate> = FormikProps<T>;

export function UserRoleUpdateForm<T extends UserRoleUpdate>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: UserRoleUpdateFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
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
