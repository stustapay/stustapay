import { LockOutlined as LockOutlinedIcon } from "@mui/icons-material";
import { Avatar, Box, Button, Container, CssBaseline, LinearProgress, Stack, Typography } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { useLoginMutation, useLogoutMutation } from "@/api";
import { config } from "@/api/common";
import PinUidHowToImg from "@/assets/img/pin_uid_howto.svg";
import i18n from "@/i18n";
import { selectIsAuthenticated, useAppSelector } from "@/store";

const validationSchema = z.object({
  userTagPin: z.string({ error: i18n.t("pinRequired") }),
});

type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
  userTagPin: "",
};

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsAuthenticated);
  const [query, setQuery] = useSearchParams();
  const [login] = useLoginMutation();
  const [logout] = useLogoutMutation();

  // direct login from POST parameters (wristband QR code scan or ticket shop)
  const loginToken = query.get("pin") ?? query.get("ticketVoucher");
  React.useEffect(() => {
    if (!loginToken) {
      return;
    }
    if (isLoggedIn) {
      logout()
        .unwrap()
        .catch((err) => {
          console.error("Failed to logout before login with new token", err);
        });
      return;
    }

    setQuery((prev) => {
      prev.delete("pin");
      prev.delete("ticketVoucher");
      return prev;
    });

    login({ loginPayload: { pin: loginToken, node_id: config.apiConfig.node_id } })
      .unwrap()
      .then(() => {})
      .catch((err) => {
        toast.error(t("loginFailed", { reason: err.error }));
      });
  }, [query, isLoggedIn, loginToken, login, logout, setQuery, t]);

  if (isLoggedIn && !loginToken) {
    const next = query.get("next");
    const redirectUrl = next != null ? next : "/";
    return <Navigate to={redirectUrl} />;
  }

  const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
    setSubmitting(true);
    login({ loginPayload: { pin: values.userTagPin, node_id: config.apiConfig.node_id } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
      })
      .catch((err) => {
        setSubmitting(false);
        console.log(err);
        toast.error(t("loginFailed", { reason: err.error }));
      });
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Stack sx={{ alignItems: "center", justifyContent: "center" }}>
        <Avatar sx={{ margin: 1, backgroundColor: "primary.main" }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(validationSchema)}
        >
          {(formik) => (
            <Form onSubmit={formik.handleSubmit} style={{ width: "100%" }}>
              <Stack spacing={2}>
                <input type="hidden" name="remember" value="true" />

                <FormTextField
                  variant="outlined"
                  autoFocus
                  type="text"
                  autoComplete="current-password"
                  name="userTagPin"
                  label={t("userTagPin")}
                  formik={formik}
                />

                {formik.isSubmitting && <LinearProgress />}
                <Button type="submit" fullWidth variant="contained" color="primary" disabled={formik.isSubmitting}>
                  {t("login")}
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
        <Box
          sx={{
            height: "3em",
          }}
        />
        <Typography variant="h6" gutterBottom>
          {t("wristbandTagExample")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t("wristbandTagExampleDescription")}
        </Typography>
        <img
          title={t("wristbandTagExampleTitle")}
          src={PinUidHowToImg}
          style={{
            width: "100%",
            height: "auto",
            marginTop: "-1em",
          }}
        />
      </Stack>
    </Container>
  );
};
