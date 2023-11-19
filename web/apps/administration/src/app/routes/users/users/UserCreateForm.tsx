import { CreateUserPayload } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type UserCreateFormProps<T extends CreateUserPayload> = FormikProps<T>;

export function UserCreateForm<T extends CreateUserPayload>(props: UserCreateFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="login" label={t("userLogin")} formik={props} />
      <FormTextField name="display_name" label={t("userDisplayName")} formik={props} />
      <FormTextField name="user_tag_uid_hex" label={t("user.tagUid")} formik={props} />
      <FormTextField name="description" label={t("userDescription")} formik={props} />
      <FormTextField type="password" name="password" label={t("userPassword")} formik={props} />
    </>
  );
}
