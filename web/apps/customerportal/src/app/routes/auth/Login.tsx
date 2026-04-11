import { useLoginMutation } from "@/api";
import { config } from "@/api/common";
import PinUidHowToImg from "@/assets/img/pin_uid_howto.svg";
import { selectIsAuthenticated, setAuthenticatedSession, useAppDispatch, useAppSelector } from "@/store";
import { LockOutlined as LockOutlinedIcon } from "@mui/icons-material";
import { Avatar, Box, Button, Container, CssBaseline, LinearProgress, Paper, Stack, Typography, useTheme } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

const validationSchema = z.object({
  userTagUid: z.string(),
  userTagPin: z.string(),
});


type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
  userTagUid: "",
  userTagPin: "",
};

export const Login: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsAuthenticated);
  const dispatch = useAppDispatch();
  const [query] = useSearchParams();
  const [login] = useLoginMutation();

  if (isLoggedIn) {
    const next = query.get("next");
    const redirectUrl = next != null ? next : "/";
    return <Navigate to={redirectUrl} />;
  }

  const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
    setSubmitting(true);

    login({
      loginPayload: {
        username: values.userTagUid,
        pin: values.userTagPin,
        node_id: config.apiConfig.node_id,
      }
    })
      .unwrap()
      .then((response) => {
        dispatch(
          setAuthenticatedSession({
            token: response.access_token,
            portalNodeId: config.apiConfig.node_id,
          })
        );
        setSubmitting(false);
      })
      .catch((err: any) => {
        setSubmitting(false);
        console.log(err);
        toast.error(t("loginFailed", { reason: err.error }));
      });
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper
        className="glass-card"
        sx={{
          p: 4,
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "var(--glass-bg)",
          backdropFilter: "blur(10px)",
          border: "var(--border-glass)",
        }}
      >
        <Stack alignItems="center" justifyContent="center" width="100%">
          <Avatar sx={{
            margin: 1,
            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "var(--primary-main, #1976d2)",
            color: isDarkMode ? "white" : "white",
            opacity: 0.9
          }}>
            <LockOutlinedIcon color="inherit" />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{
            color: isDarkMode ? "white" : "var(--primary-main, #1976d2)",
            fontWeight: "bold",
            mb: 2
          }}>
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
                    autoComplete="username"
                    name="userTagUid"
                    label={t("userTagUid")}
                    formik={formik}
                  />

                  <FormTextField
                    variant="outlined"
                    type="password"
                    autoComplete="current-password"
                    label={t("userTagPin")}
                    name="userTagPin"
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
              height: "2em",
            }}
          />
          <Typography variant="subtitle1" gutterBottom sx={{
            color: isDarkMode ? "white" : "var(--primary-main, #1976d2)",
            fontWeight: "bold"
          }}>
            {t("wristbandTagExample")}
          </Typography>
          <Typography variant="body2" gutterBottom align="center" sx={{ color: "text.secondary" }}>
            {t("wristbandTagExampleDescription")}
          </Typography>
          <Box
            component="img"
            src={PinUidHowToImg}
            alt={t("wristbandTagExampleTitle")}
            sx={{
              width: "100%",
              height: "auto",
              marginTop: "1em",
              filter: isDarkMode ? "invert(1) brightness(0.9)" : "none",
            }}
          />
        </Stack>
      </Paper>
    </Container>
  );
};
