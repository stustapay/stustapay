import { NewCashRegister } from "@/api";
import { TextField } from "@mui/material";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TillRegisterFormProps<T extends NewCashRegister> = FormikProps<T>;

export function TillRegisterForm<T extends NewCashRegister>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TillRegisterFormProps<T>) {
  const { t } = useTranslation();
  return (
    <TextField
      variant="standard"
      margin="normal"
      fullWidth
      autoFocus
      name="name"
      label={t("register.name")}
      error={touched.name && !!errors.name}
      helperText={(touched.name && errors.name) as string}
      onBlur={handleBlur}
      onChange={handleChange}
      value={values.name}
    />
  );
}
