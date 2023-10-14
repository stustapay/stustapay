import { NewTillProfile } from "@/api";
import { RoleSelect, TillLayoutSelect } from "@/components/features";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TillProfileFormProps<T extends NewTillProfile> = FormikProps<T>;

export function TillProfileForm<T extends NewTillProfile>(props: TillProfileFormProps<T>) {
  const { values, handleChange, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("profile.name")} formik={props} />
      <FormTextField name="description" label={t("profile.description")} formik={props} />

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
        label={t("profile.allowedUserRoles")}
        error={touched.allowed_role_names && !!errors.allowed_role_names}
        helperText={(touched.allowed_role_names && errors.allowed_role_names) as string}
        onChange={(value) => setFieldValue("allowed_role_names", value)}
        value={values.allowed_role_names}
      />

      <TillLayoutSelect
        name="layout"
        label={t("layout.layout")}
        error={touched.layout_id && !!errors.layout_id}
        helperText={(touched.layout_id && errors.layout_id) as string}
        onChange={(value) => setFieldValue("layout_id", value)}
        value={values.layout_id}
      />
    </>
  );
}
