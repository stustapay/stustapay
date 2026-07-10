import { FormCurrencyInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewTicket } from "@/api";
import { TaxRateSelect, UserTagVariantSelect } from "@/components/features";

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

      <UserTagVariantSelect
        label={t("ticket.restriction")}
        multiple={false}
        value={values.user_tag_variant_ids.length > 0 ? values.user_tag_variant_ids[0] : null}
        disabled={values.is_locked}
        onChange={(value) => setFieldValue("user_tag_variant_ids", value == null ? [] : [value])}
        error={touched.user_tag_variant_ids && !!errors.user_tag_variant_ids}
        helperText={(touched.user_tag_variant_ids && errors.user_tag_variant_ids) as string}
      />
    </>
  );
}
