import { useChangePasswordMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import i18n from "../../../../i18n";

const validationSchema = z
  .object({
    oldPassword: z.string(),
    newPassword: z.string(),
    confirmNewPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: i18n.t("auth.passwordsDontMatch"),
    path: ["confirmNewPassword"],
  });

type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
  oldPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export const PasswordChange: React.FC = () => {
  const { t } = useTranslation();

  const [changePassword] = useChangePasswordMutation();

  const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
    setSubmitting(true);
    changePassword({
      changePasswordPayload: { old_password: values.oldPassword, new_password: values.newPassword },
    })
      .unwrap()
      .then(() => {
        toast.success(t("auth.successfullyChangedPassword"));
        setSubmitting(false);
      })
      .catch((err) => {
        setSubmitting(false);
        console.log(err);
        toast.error(t("auth.passwordChangeFailed", { reason: err.error }));
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(validationSchema)}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormTextField
              variant="outlined"
              type="password"
              label={t("auth.oldPassword")}
              name="oldPassword"
              formik={formik}
            />
            <FormTextField
              variant="outlined"
              type="password"
              label={t("auth.newPassword")}
              name="newPassword"
              formik={formik}
            />

            <FormTextField
              variant="outlined"
              type="password"
              label={t("auth.confirmNewPassword")}
              name="confirmNewPassword"
              formik={formik}
            />

            {formik.isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={formik.isSubmitting}>
              {t("submit")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
