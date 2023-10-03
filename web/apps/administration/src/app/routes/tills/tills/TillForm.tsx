import { NewTill } from "@/api";
import { TillProfileSelect } from "@/components/features";
import { TextField } from "@mui/material";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TillFormProps<T extends NewTill> = FormikProps<T>;

export function TillForm<T extends NewTill>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TillFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("till.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("till.description")}
        error={touched.description && !!errors.description}
        helperText={(touched.description && errors.description) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.description}
      />

      <TillProfileSelect
        name="layout"
        margin="normal"
        variant="standard"
        label={t("till.profile")}
        error={touched.active_profile_id && !!errors.active_profile_id}
        helperText={(touched.active_profile_id && errors.active_profile_id) as string}
        onChange={(value) => setFieldValue("active_profile_id", value)}
        value={values.active_profile_id}
      />
    </>
  );
}
