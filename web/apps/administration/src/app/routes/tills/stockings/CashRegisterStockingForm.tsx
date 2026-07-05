import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

import { NewCashRegisterStocking } from "@/api";

import { StockingMakeupFormTable } from "./StockingMakeupFormTable";

export type CashRegisterStockingFormProps<T extends NewCashRegisterStocking> = FormikProps<T>;

export function CashRegisterStockingForm<T extends NewCashRegisterStocking>(props: CashRegisterStockingFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("register.name")} formik={props} />
      <StockingMakeupFormTable formik={props} />
    </>
  );
}
