import { NewEntryGroup } from "@stustapay/models";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type EntryGroupFormProps<T extends NewEntryGroup> = FormikProps<T>;

export const EntryGroupForm = <T extends NewEntryGroup>({ ...props }: EntryGroupFormProps<T>) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="name" label={t("common.name")} formik={props} />
      <FormTextField name="description" label={t("common.description")} formik={props} />
    </>
  );
};
