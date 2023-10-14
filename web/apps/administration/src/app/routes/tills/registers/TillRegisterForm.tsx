import { NewCashRegister } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TillRegisterFormProps<T extends NewCashRegister> = FormikProps<T>;

export function TillRegisterForm<T extends NewCashRegister>(props: TillRegisterFormProps<T>) {
  const { t } = useTranslation();
  return <FormTextField autoFocus name="name" label={t("register.name")} formik={props} />;
}
