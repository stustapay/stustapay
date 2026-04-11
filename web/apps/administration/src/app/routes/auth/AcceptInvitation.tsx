import { useAcceptInvitationMutation } from "@/api";
import { LockOutlined as LockOutlinedIcon } from "@mui/icons-material";
import {
  Stack,
  Avatar,
  Button,
  Container,
  CssBaseline,
  LinearProgress,
  Typography,
} from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

type FormSchema = {
  password: string;
  confirmPassword: string;
};

const initialValues: FormSchema = {
  password: "",
  confirmPassword: "",
};

export const AcceptInvitation: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptInvitation] = useAcceptInvitationMutation();
  const validationSchema = React.useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t("user.passwordTooShort")),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("user.passwordsDontMatch"),
          path: ["confirmPassword"],
        }),
    [t]
  );

  if (!token) {
    return (
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Stack sx={{ marginTop: 8, alignItems: "center" }}>
          <Typography variant="h5" component="h1">
            {t("user.invitationInvalid")}
          </Typography>
          <Button variant="contained" onClick={() => navigate("/login")} sx={{ mt: 2 }}>
            {t("goToLogin")}
          </Button>
        </Stack>
      </Container>
    );
  }

  const handleSubmit = async (values: FormSchema, helpers: FormikHelpers<FormSchema>) => {
    setIsSubmitting(true);
    try {
      await acceptInvitation({
        acceptInvitationPayload: {
          token,
          password: values.password,
        },
      }).unwrap();
      toast.success(t("user.invitationAccepted"));
      navigate("/login");
    } catch (err) {
      const error = err as { data?: { detail?: string } };
      toast.error(error.data?.detail || t("user.invitationAcceptFailed"));
      helpers.setSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Stack sx={{ marginTop: 8, alignItems: "center" }}>
        <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {t("user.acceptInvitation")}
        </Typography>
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(validationSchema)}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form>
              <Stack spacing={2} sx={{ mt: 1, width: "100%" }}>
                {isSubmitting && <LinearProgress />}
                <FormTextField
                  name="password"
                  label={t("userPassword")}
                  type="password"
                  formik={formik}
                  autoFocus
                />
                <FormTextField
                  name="confirmPassword"
                  label={t("user.confirmPassword")}
                  type="password"
                  formik={formik}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting || formik.isSubmitting}
                >
                  {t("user.setPassword")}
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Stack>
    </Container>
  );
};
