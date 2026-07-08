import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { NewUserTagVariant } from "@stustapay/models";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type UserTagVariantFormProps<T extends NewUserTagVariant> = FormikProps<T>;

export function UserTagVariantForm<T extends NewUserTagVariant>(props: UserTagVariantFormProps<T>) {
  const { t } = useTranslation();

  return (
    <>
      <FormTextField autoFocus name="variant_name" label={t("userTagVariant.name")} formik={props} />
      <FormTextField name="description" label={t("userTagVariant.description")} formik={props} />
      <FormNumericInput name="priority" label={t("userTagVariant.priority")} formik={props} />
    </>
  );
}
