import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { config } from "@/api/common";
import { useCurrentNode } from "@/hooks";
import { Button, LinearProgress, Stack, Typography, ListItem, ListItemText, Alert } from "@mui/material";
import { FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "Required if sumup payment is enabled",
};

export const SumUpSettingsSchema = z
  .object({
    sumup_topup_enabled: z.boolean(),
    sumup_payment_enabled: z.boolean(),
    sumup_api_key: z
      .string()
      .optional()
      .transform((val) => val ?? ""),
    sumup_affiliate_key: z
      .string()
      .optional()
      .transform((val) => val ?? ""),
    sumup_merchant_code: z
      .string()
      .optional()
      .transform((val) => val ?? ""),
    sumup_oauth_client_id: z
      .string()
      .optional()
      .transform((val) => val ?? ""),
    sumup_oauth_client_secret: z
      .string()
      .optional()
      .transform((val) => val ?? ""),
  })
  .superRefine((data, ctx) => {
    if (!data.sumup_topup_enabled && !data.sumup_payment_enabled) {
      return;
    }
    if (data.sumup_api_key === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_api_key"] });
    }
    if (data.sumup_affiliate_key === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_affiliate_key"] });
    }
    if (data.sumup_merchant_code === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_merchant_code"] });
    }
    if (data.sumup_oauth_client_id === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_oauth_client_id"] });
    }
    if (data.sumup_oauth_client_secret === "") {
      ctx.addIssue({ ...requiredIssue, path: ["sumup_oauth_client_secret"] });
    }
  });

export type SumUpSettings = z.infer<typeof SumUpSettingsSchema>;

export const SumupSettingsForm: React.FC<FormikProps<SumUpSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
      <FormSwitch label={t("settings.sumup.sumup_topup_enabled")} name="sumup_topup_enabled" formik={formik} />
      <FormSwitch label={t("settings.sumup.sumup_payment_enabled")} name="sumup_payment_enabled" formik={formik} />
      <FormTextField label={t("settings.sumup.sumup_affiliate_key")} name="sumup_affiliate_key" formik={formik} />
      <FormTextField label={t("settings.sumup.sumup_api_key")} name="sumup_api_key" formik={formik} />
      <FormTextField label={t("settings.sumup.sumup_merchant_code")} name="sumup_merchant_code" formik={formik} />
      <FormTextField label={t("settings.sumup.sumup_oauth_client_id")} name="sumup_oauth_client_id" formik={formik} />
      <FormTextField
        label={t("settings.sumup.sumup_oauth_client_secret")}
        name="sumup_oauth_client_secret"
        formik={formik}
      />
    </>
  );
};

const getSumupOauthUrl = (eventSettings: RestrictedEventSettings, redirectUrl: string) => {
  const nonce = "fsadffffnwefmvsnef";

  return `https://api.sumup.com/authorize?response_type=code&client_id=${eventSettings.sumup_oauth_client_id}&redirect_uri=${redirectUrl}&state=${nonce}`;
};

export const TabSumUp: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const sumupRedirectUrl = `${config.adminBaseUrl}/node/${currentNode.id}/settings/sumup-redirect`;

  const handleSubmit = (values: SumUpSettings, { setSubmitting }: FormikHelpers<SumUpSettings>) => {
    setSubmitting(true);
    updateEvent({ nodeId: nodeId, updateEvent: { ...eventSettings, ...values } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.updateEventSucessful"));
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("settings.updateEventFailed", { reason: err.error }));
      });
  };

  const handleLoginWithSumup = () => {
    const sumupUrl = getSumupOauthUrl(eventSettings, sumupRedirectUrl);
    window.location.href = sumupUrl;
  };

  return (
    <Stack spacing={2}>
      {!config.sumupTopupEnabledGlobally && (
        <Alert severity="warning">Sumup Payment is disabled globally in this StuStayPay instances configuration</Alert>
      )}
      <Formik
        initialValues={eventSettings as SumUpSettings} // TODO: figure out a way of not needing to cast this
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(SumUpSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <SumupSettingsForm {...formik} />
              <ListItem>
                <ListItemText primary="Sumup refresh token" secondary={eventSettings.sumup_oauth_refresh_token} />
              </ListItem>
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
      <Typography>{t("settings.sumup.sumup_redirect_url", { redirectUrl: sumupRedirectUrl })}</Typography>
      <Button onClick={handleLoginWithSumup}>{t("settings.sumup.login_with_sumup")}</Button>
    </Stack>
  );
};
