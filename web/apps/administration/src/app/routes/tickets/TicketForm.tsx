import { NewTicket } from "@/api";
import { RestrictionSelect, TaxRateSelect } from "@/components/features";
import { FormCurrencyInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TicketFormProps<T extends NewTicket> = FormikProps<T>;

export function TicketForm<T extends NewTicket>(props: TicketFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="name" label={t("ticket.name")} formik={props} />
      <FormCurrencyInput name="price" label={t("ticket.price")} formik={props} disabled={values.is_locked} />
      <FormCurrencyInput
        name="initial_top_up_amount"
        disabled={values.is_locked}
        label={t("ticket.initialTopUpAmount")}
        formik={props}
      />

      <TaxRateSelect
        label={t("product.taxRate")}
        disabled={values.is_locked}
        error={touched.tax_rate_id && !!errors.tax_rate_id}
        helperText={(touched.tax_rate_id && errors.tax_rate_id) as string}
        onChange={(value) => setFieldValue("tax_rate_id", value)}
        value={values.tax_rate_id}
      />

      <RestrictionSelect
        label={t("ticket.restriction")}
        multiple={false}
        value={values.restrictions.length > 0 ? values.restrictions[0] : null}
        disabled={values.is_locked}
        onChange={(value) => setFieldValue("restrictions", [value])}
        error={touched.restrictions && !!errors.restrictions}
        helperText={(touched.restrictions && errors.restrictions) as string}
      />
    </>
  );
}
