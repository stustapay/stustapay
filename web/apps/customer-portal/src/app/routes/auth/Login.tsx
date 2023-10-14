import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Form, Formik, FormikHelpers } from "formik";
import { Avatar, Box, Button, Container, CssBaseline, LinearProgress, Typography, Stack } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { z } from "zod";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { LockOutlined as LockOutlinedIcon } from "@mui/icons-material";
import { useLoginMutation } from "@/api/authApi";
import { toFormikValidationSchema } from "@stustapay/utils";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { ReactComponent as PinUidHowToImg } from "@/assets/img/pin_uid_howto.svg";

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
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsAuthenticated);
  const [query] = useSearchParams();
  const [login] = useLoginMutation();

  if (isLoggedIn) {
    const next = query.get("next");
    const redirectUrl = next != null ? next : "/";
    return <Navigate to={redirectUrl} />;
  }

  const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
    setSubmitting(true);
    login(values)
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
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
            <Form onSubmit={formik.handleSubmit}>
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
                <FormTextField
                  variant="outlined"
                  type="text"
                  autoComplete="username"
                  label={t("userTagUid")}
                  name="userTagUid"
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
        <PinUidHowToImg
          title={t("wristbandTagExampleTitle")}
          style={{
            width: "100%",
            height: "auto",
            marginTop: "-1em",
          }}
        />
      </Box>
    </Container>
  );
};
