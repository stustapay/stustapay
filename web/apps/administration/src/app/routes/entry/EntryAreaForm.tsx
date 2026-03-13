import { NewEntryArea } from "@stustapay/models";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type EntryAreaFormProps<T extends NewEntryArea> = FormikProps<T>;

export const EntryAreaForm = <T extends NewEntryArea>({ ...props }: EntryAreaFormProps<T>) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("common.name")} formik={props} />
      <FormTextField name="description" label={t("common.description")} formik={props} />
    </>
  );
};
