import { NewCashRegisterStocking } from "@/api";
import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type CashRegisterStockingFormProps<T extends NewCashRegisterStocking> = FormikProps<T>;

export function CashRegisterStockingForm<T extends NewCashRegisterStocking>(props: CashRegisterStockingFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("register.name")} formik={props} />
      <FormNumericInput label={t("register.euro200")} name="euro200" formik={props} />
      <FormNumericInput label={t("register.euro100")} name="euro100" formik={props} />
      <FormNumericInput label={t("register.euro50")} name="euro50" formik={props} />
      <FormNumericInput label={t("register.euro20")} name="euro20" formik={props} />
      <FormNumericInput label={t("register.euro10")} name="euro10" formik={props} />
      <FormNumericInput label={t("register.euro5")} name="euro5" formik={props} />
      <FormNumericInput label={t("register.euro2")} name="euro2" formik={props} />
      <FormNumericInput label={t("register.euro1")} name="euro1" formik={props} />
      <FormNumericInput label={t("register.cent50")} name="cent50" formik={props} />
      <FormNumericInput label={t("register.cent20")} name="cent20" formik={props} />
      <FormNumericInput label={t("register.cent10")} name="cent10" formik={props} />
      <FormNumericInput label={t("register.cent5")} name="cent5" formik={props} />
      <FormNumericInput label={t("register.cent2")} name="cent2" formik={props} />
      <FormNumericInput label={t("register.cent1")} name="cent1" formik={props} />
      <FormNumericInput label={t("register.variableInEuro")} name="variable_in_euro" formik={props} />
    </>
  );
}
