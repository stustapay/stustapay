import {
  GlobalEmailConfig,
  useGetGlobalEmailConfigQuery,
  useSendGlobalEmailTestMutation,
  useUpdateGlobalEmailConfigMutation,
} from "@/api";
import { LoadingButton } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { FormSwitch, FormTextField, FormNumericInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { Loading } from "@stustapay/components";

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "Required if email sending is enabled",
};

const GlobalEmailSettingsSchema = z
  .object({
    email_enabled: z.boolean(),
    email_default_sender: z.string().email().optional().nullable(),
    email_smtp_host: z.string().optional().nullable(),
    email_smtp_port: z.number().int().optional().nullable(),
    email_smtp_username: z.string().optional().nullable(),
    email_smtp_password: z.string().optional().nullable(),
    invitation_subject: z.string().optional().nullable(),
    invitation_text_body: z.string().optional().nullable(),
    invitation_html_body: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.email_enabled) {
      return;
    }
    if (!data.email_default_sender) {
      ctx.addIssue({ ...requiredIssue, path: ["email_default_sender"] });
    }
    if (!data.email_smtp_host) {
      ctx.addIssue({ ...requiredIssue, path: ["email_smtp_host"] });
    }
    if (!data.email_smtp_port) {
      ctx.addIssue({ ...requiredIssue, path: ["email_smtp_port"] });
    }
  });

type GlobalEmailSettings = z.infer<typeof GlobalEmailSettingsSchema>;

const GlobalEmailSettingsForm: React.FC<FormikProps<GlobalEmailSettings>> = (formik) => {
  const { t } = useTranslation();

  return (
    <>
      <FormSwitch label={t("settings.email.enabled")} name="email_enabled" formik={formik} />
      <FormTextField label={t("settings.email.default_sender")} name="email_default_sender" formik={formik} />
      <FormTextField label={t("settings.email.smtp_host")} name="email_smtp_host" formik={formik} />
      <FormNumericInput label={t("settings.email.smtp_port")} name="email_smtp_port" formik={formik} />
      <FormTextField label={t("settings.email.smtp_username")} name="email_smtp_username" formik={formik} />
      <FormTextField label={t("settings.email.smtp_password")} name="email_smtp_password" formik={formik} />
      <FormTextField label={t("settings.email.invitation_subject")} name="invitation_subject" formik={formik} />
      <FormTextField
        label={t("settings.email.invitation_text_body")}
        name="invitation_text_body"
        formik={formik}
        multiline
        minRows={8}
      />
      <FormTextField
        label={t("settings.email.invitation_html_body")}
        name="invitation_html_body"
        formik={formik}
        multiline
        minRows={10}
      />
      <Box>
        <Typography variant="subtitle2">{t("settings.email.templateVariables")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("settings.email.templateVariablesHelp")}
        </Typography>
      </Box>
    </>
  );
};

export const TabGlobalEmail: React.FC = () => {
  const { t } = useTranslation();
  const { data: emailSettings, isLoading, error } = useGetGlobalEmailConfigQuery();
  const [updateGlobalEmailConfig] = useUpdateGlobalEmailConfigMutation();
  const [sendGlobalEmailTest, testMailState] = useSendGlobalEmailTestMutation();

  const handleSubmit = (values: GlobalEmailSettings, { setSubmitting }: FormikHelpers<GlobalEmailSettings>) => {
    setSubmitting(true);
    updateGlobalEmailConfig({ globalEmailConfig: values as GlobalEmailConfig })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.email.updateSuccess"));
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("settings.email.updateFailed", { reason: err?.data?.detail ?? err.error }));
      });
  };

  const handleSendPreviewTestMail = () => {
    sendGlobalEmailTest()
      .unwrap()
      .then((resp) => {
        toast.success(resp.message || t("settings.email.testMailQueued"));
      })
      .catch((err) => {
        toast.error(t("settings.email.testMailFailed", { reason: err?.data?.detail ?? err.error }));
      });
  };

  if (isLoading || (!emailSettings && !error)) {
    return <Loading />;
  }

  if (!emailSettings || error) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("settings.email.loadErrorTitle")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Formik
      initialValues={emailSettings as GlobalEmailSettings}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(GlobalEmailSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <GlobalEmailSettingsForm {...formik} />
            <LoadingButton
              variant="outlined"
              onClick={handleSendPreviewTestMail}
              loading={testMailState.isLoading}
            >
              {t("settings.email.sendPreviewTestMail")}
            </LoadingButton>
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
