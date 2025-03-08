import { NewCashRegister } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type CashRegisterFormProps<T extends NewCashRegister> = FormikProps<T>;

export function CashRegisterForm<T extends NewCashRegister>(props: CashRegisterFormProps<T>) {
  const { t } = useTranslation();
  return <FormTextField autoFocus name="name" label={t("register.name")} formik={props} />;
}
