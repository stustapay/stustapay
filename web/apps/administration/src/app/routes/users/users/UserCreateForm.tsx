import { CreateUserPayload } from "@/api";
import { RoleSelect } from "@/components/features";
import { TextField } from "@mui/material";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type UserCreateFormProps<T extends CreateUserPayload> = FormikProps<T>;

export function UserCreateForm<T extends CreateUserPayload>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: UserCreateFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="login"
        label={t("userLogin")}
        error={touched.login && !!errors.login}
        helperText={(touched.login && errors.login) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.login}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="display_name"
        label={t("userDisplayName")}
        error={touched.display_name && !!errors.display_name}
        helperText={(touched.display_name && errors.display_name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.display_name}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="user_tag_uid_hex"
        label={t("user.tagUid")}
        error={touched.user_tag_uid_hex && !!errors.user_tag_uid_hex}
        helperText={(touched.user_tag_uid_hex && errors.user_tag_uid_hex) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.user_tag_uid_hex}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("userDescription")}
        error={touched.description && !!errors.description}
        helperText={(touched.description && errors.description) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.description}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        type="password"
        name="password"
        label={t("userPassword")}
        error={touched.password && !!errors.password}
        helperText={(touched.password && errors.password) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.password}
      />

      <RoleSelect
        label={t("user.roles")}
        variant="standard"
        margin="normal"
        value={values.role_names}
        onChange={(val) => setFieldValue("role_names", val)}
        error={touched.role_names && !!errors.role_names}
        helperText={(touched.role_names && errors.role_names) as string}
      />
    </>
  );
}
