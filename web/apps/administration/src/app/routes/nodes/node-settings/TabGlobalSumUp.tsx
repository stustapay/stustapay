import { GlobalSumUpConfig, useGetGlobalSumupConfigQuery, useUpdateGlobalSumupConfigMutation } from "@/api";
import { config } from "@/api/common";
import { Alert, AlertTitle, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { SUMUP_OAUTH_CALLBACK_PATH } from "../sumupOauth";

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "OAuth client ID and secret must either both be set or both be empty",
};

const GlobalSumUpSettingsSchema = z
  .object({
    sumup_affiliate_key: z.string(),
    sumup_oauth_client_id: z.string(),
    sumup_oauth_client_secret: z.string(),
  })
  .superRefine((data, ctx) => {
    const hasClientId = data.sumup_oauth_client_id.trim() !== "";
    const hasClientSecret = data.sumup_oauth_client_secret.trim() !== "";
    if (hasClientId !== hasClientSecret) {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_oauth_client_id"] });
      ctx.addIssue({ ...requiredIssue, path: ["sumup_oauth_client_secret"] });
    }
  });

type GlobalSumUpSettings = z.infer<typeof GlobalSumUpSettingsSchema>;

const GlobalSumUpSettingsForm: React.FC<FormikProps<GlobalSumUpSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField label={t("settings.sumup.sumup_affiliate_key")} name="sumup_affiliate_key" type="password" formik={formik} />
      <FormTextField label={t("settings.sumup.sumup_oauth_client_id")} name="sumup_oauth_client_id" formik={formik} />
      <FormTextField
        label={t("settings.sumup.sumup_oauth_client_secret")}
        name="sumup_oauth_client_secret"
        type="password"
        formik={formik}
      />
      <Typography>{t("settings.sumup.sumup_redirect_url", { redirectUrl: `${config.adminBaseUrl}${SUMUP_OAUTH_CALLBACK_PATH}` })}</Typography>
    </>
  );
};

export const TabGlobalSumUp: React.FC = () => {
  const { t } = useTranslation();
  const { data: sumupConfig, isLoading, error } = useGetGlobalSumupConfigQuery();
  const [updateGlobalSumupConfig] = useUpdateGlobalSumupConfigMutation();

  const handleSubmit = (values: GlobalSumUpSettings, { setSubmitting }: FormikHelpers<GlobalSumUpSettings>) => {
    setSubmitting(true);
    updateGlobalSumupConfig({ globalSumUpConfig: values as GlobalSumUpConfig })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.sumup.globalUpdateSuccess"));
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("settings.sumup.globalUpdateFailed", { reason: err?.data?.detail ?? err.error }));
      });
  };

  if (isLoading || (!sumupConfig && !error)) {
    return <Loading />;
  }

  if (!sumupConfig || error) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("settings.sumup.globalLoadErrorTitle")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Formik
      initialValues={sumupConfig as GlobalSumUpSettings}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(GlobalSumUpSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <GlobalSumUpSettingsForm {...formik} />
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={formik.isSubmitting || Object.keys(formik.touched).length === 0}
            >
              {t("save")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
