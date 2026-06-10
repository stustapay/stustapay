import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

import { NewCashRegister } from "@/api";

export type CashRegisterFormProps<T extends NewCashRegister> = FormikProps<T>;

export function CashRegisterForm<T extends NewCashRegister>(props: CashRegisterFormProps<T>) {
  const { t } = useTranslation();
  return <FormTextField autoFocus name="name" label={t("register.name")} formik={props} />;
}
