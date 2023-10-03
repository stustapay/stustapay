import { useChangePasswordMutation } from "@/api";
import { Button, LinearProgress, TextField } from "@mui/material";
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
    changePassword({ changePasswordPayload: { old_password: values.oldPassword, new_password: values.newPassword } })
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
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched }) => (
        <Form onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            autoFocus
            type="password"
            label={t("auth.oldPassword")}
            name="oldPassword"
            onBlur={handleBlur}
            onChange={handleChange}
            value={values.oldPassword}
            error={touched.oldPassword && !!errors.oldPassword}
            helperText={(touched.oldPassword && errors.oldPassword) as string}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            type="password"
            label={t("auth.newPassword")}
            name="newPassword"
            onBlur={handleBlur}
            onChange={handleChange}
            value={values.newPassword}
            error={touched.newPassword && !!errors.newPassword}
            helperText={(touched.newPassword && errors.newPassword) as string}
          />

          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            type="password"
            label={t("auth.confirmNewPassword")}
            name="confirmNewPassword"
            onBlur={handleBlur}
            onChange={handleChange}
            value={values.confirmNewPassword}
            error={touched.confirmNewPassword && !!errors.confirmNewPassword}
            helperText={(touched.confirmNewPassword && errors.confirmNewPassword) as string}
          />

          {isSubmitting && <LinearProgress />}
          <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
            {t("submit")}
          </Button>
        </Form>
      )}
    </Formik>
  );
};
