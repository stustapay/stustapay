import * as React from "react";
import { NewTerminal } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TerminalFormProps<T extends NewTerminal> = FormikProps<T>;

export function TerminalForm<T extends NewTerminal>(props: TerminalFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("common.name")} formik={props} />
      <FormTextField name="description" label={t("common.description")} formik={props} />
    </>
  );
}
