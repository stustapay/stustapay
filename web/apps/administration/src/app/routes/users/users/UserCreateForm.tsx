import { CreateUserPayload } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

type UserCreateFormValues = CreateUserPayload & { email?: string | null };

export type UserCreateFormProps<T extends UserCreateFormValues> = FormikProps<T>;

export function UserCreateForm<T extends UserCreateFormValues>(props: UserCreateFormProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField autoFocus name="login" label={t("userLogin")} formik={props} />
      <FormTextField name="display_name" label={t("userDisplayName")} formik={props} />
      <FormTextField name="description" label={t("userDescription")} formik={props} />
      <FormTextField type="email" name="email" label={t("userEmail")} formik={props as any} />
      <FormTextField type="password" name="password" label={t("userPassword")} formik={props} />
      <FormTextField name="user_tag_uid_hex" label={t("userTag.uid")} formik={props} />
      <FormTextField name="user_tag_pin" label={t("userTag.pin")} formik={props} />
    </>
  );
}
