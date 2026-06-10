import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewTerminal } from "@/api";

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
