import { useLoginMutation } from "@/api";
import { config } from "@/api/common";
import { ReactComponent as PinUidHowToImg } from "@/assets/img/pin_uid_howto.svg";
import { selectIsAuthenticated, useAppSelector } from "@/store";
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

const validationSchema = z.object({
  userTagPin: z.string(),
});

type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
  userTagPin: "",
};

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsAuthenticated);
  const [query] = useSearchParams();
  const [login] = useLoginMutation();

  const ticketVoucher = query.get("ticketVoucher");
  React.useEffect(() => {
    if (isLoggedIn || !ticketVoucher) {
      return;
    }

    login({ loginPayload: { pin: ticketVoucher, node_id: config.apiConfig.node_id } })
      .unwrap()
      .catch((err) => {
        toast.error(t("loginFailed", { reason: err.error }));
      });
  }, [query, isLoggedIn, ticketVoucher, login, t]);

  if (isLoggedIn) {
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
      <Stack alignItems="center" justifyContent="center">
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
        <PinUidHowToImg
          title={t("wristbandTagExampleTitle")}
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
