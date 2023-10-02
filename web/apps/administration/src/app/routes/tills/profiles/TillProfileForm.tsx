import { NewTillProfile } from "@/api";
import { RoleSelect, TillLayoutSelect } from "@/components/features";
import { Checkbox, FormControlLabel, FormGroup, TextField } from "@mui/material";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TillProfileFormProps<T extends NewTillProfile> = FormikProps<T>;

export function TillProfileForm<T extends NewTillProfile>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TillProfileFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("profile.name")}
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
        label={t("profile.description")}
        error={touched.description && !!errors.description}
        helperText={(touched.description && errors.description) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.description}
      />

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_top_up" checked={values.allow_top_up} onChange={handleChange} />}
          label={t("profile.allowTopUp")}
        />
      </FormGroup>

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_cash_out" checked={values.allow_cash_out} onChange={handleChange} />}
          label={t("profile.allowCashOut")}
        />
      </FormGroup>

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_ticket_sale" checked={values.allow_ticket_sale} onChange={handleChange} />}
          label={t("profile.allowTicketSale")}
        />
      </FormGroup>

      <RoleSelect
        margin="normal"
        variant="standard"
        label={t("profile.allowedUserRoles")}
        error={touched.allowed_role_names && !!errors.allowed_role_names}
        helperText={(touched.allowed_role_names && errors.allowed_role_names) as string}
        onChange={(value) => setFieldValue("allowed_role_names", value)}
        value={values.allowed_role_names}
      />

      <TillLayoutSelect
        name="layout"
        margin="normal"
        variant="standard"
        label={t("layout.layout")}
        error={touched.layout_id && !!errors.layout_id}
        helperText={(touched.layout_id && errors.layout_id) as string}
        onChange={(value) => setFieldValue("layout_id", value)}
        value={values.layout_id}
      />
    </>
  );
}
