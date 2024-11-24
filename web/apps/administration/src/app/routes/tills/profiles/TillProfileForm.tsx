import { NewTillProfile } from "@/api";
import { FormCheckbox, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { TillLayout, selectTillLayoutAll, useListTillLayoutsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";

export type TillProfileFormProps<T extends NewTillProfile> = FormikProps<T>;

export function TillProfileForm<T extends NewTillProfile>(props: TillProfileFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { layouts } = useListTillLayoutsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        layouts: data ? selectTillLayoutAll(data) : [],
      }),
    }
  );
  return (
    <>
      <FormTextField autoFocus name="name" label={t("profile.name")} formik={props} />
      <FormTextField name="description" label={t("profile.description")} formik={props} />
      <FormCheckbox name="allow_top_up" label={t("profile.allowTopUp")} formik={props} />
      <FormCheckbox name="allow_cash_out" label={t("profile.allowCashOut")} formik={props} />
      <FormCheckbox name="allow_ticket_sale" label={t("profile.allowTicketSale")} formik={props} />
      <FormCheckbox name="enable_ssp_payment" label={t("profile.enableSspPayment")} formik={props} />
      <FormCheckbox name="enable_cash_payment" label={t("profile.enableCashPayment")} formik={props} />
      <FormCheckbox name="enable_card_payment" label={t("profile.enableCardPayment")} formik={props} />

      <Select
        label={t("layout.layout")}
        multiple={false}
        value={layouts.find((l) => l.id === values.layout_id) ?? null}
        formatOption={(layout: TillLayout) => layout.name}
        options={layouts}
        error={touched.layout_id && !!errors.layout_id}
        helperText={(touched.layout_id && errors.layout_id) as string}
        onChange={(value: TillLayout | null) => (value != null ? setFieldValue("layout_id", value.id) : undefined)}
      />
    </>
  );
}
