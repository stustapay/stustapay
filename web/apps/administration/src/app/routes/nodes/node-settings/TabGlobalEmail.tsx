import {
  GlobalEmailConfig,
  Language,
  useGetGlobalEmailConfigQuery,
  useSendGlobalEmailTestMutation,
  useUpdateGlobalEmailConfigMutation,
} from "@/api";
import { LoadingButton } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { Select, Loading } from "@stustapay/components";
import { FormSwitch, FormTextField, FormNumericInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "Required if email sending is enabled",
};

const supportedInvitationLanguages: Language[] = ["de-DE", "en-US"];

const GlobalEmailSettingsSchema = z
  .object({
    email_enabled: z.boolean(),
    email_default_sender: z.string().email().optional().nullable(),
    email_smtp_host: z.string().optional().nullable(),
    email_smtp_port: z.number().int().optional().nullable(),
    email_smtp_username: z.string().optional().nullable(),
    email_smtp_password: z.string().optional().nullable(),
    invitation_texts: z.record(z.string(), z.record(z.string(), z.string())).default({}),
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

const updateInvitationTexts = (
  texts: GlobalEmailSettings["invitation_texts"],
  language: Language,
  field: "subject" | "text_body" | "html_body",
  value: string
) => {
  const nextTexts = JSON.parse(JSON.stringify(texts ?? {}));
  if (nextTexts[language] === undefined) {
    nextTexts[language] = {};
  }
  nextTexts[language][field] = value;
  return nextTexts;
};

const normalizeInvitationTexts = (texts: GlobalEmailSettings["invitation_texts"]) => {
  const normalized: GlobalEmailSettings["invitation_texts"] = {};
  for (const [language, templates] of Object.entries(texts ?? {})) {
    const nextTemplates: Record<string, string> = {};
    for (const [field, value] of Object.entries(templates ?? {})) {
      if (value.trim() !== "") {
        nextTemplates[field] = value;
      }
    }
    if (Object.keys(nextTemplates).length > 0) {
      normalized[language] = nextTemplates;
    }
  }
  return normalized;
};

const GlobalEmailSettingsForm: React.FC<FormikProps<GlobalEmailSettings>> = (formik) => {
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState<Language>("de-DE");
  const templates = formik.values.invitation_texts[language] ?? {};

  return (
    <>
      <FormSwitch label={t("settings.email.enabled")} name="email_enabled" formik={formik} />
      <FormTextField label={t("settings.email.default_sender")} name="email_default_sender" formik={formik} />
      <FormTextField label={t("settings.email.smtp_host")} name="email_smtp_host" formik={formik} />
      <FormNumericInput label={t("settings.email.smtp_port")} name="email_smtp_port" formik={formik} />
      <FormTextField label={t("settings.email.smtp_username")} name="email_smtp_username" formik={formik} />
      <FormTextField label={t("settings.email.smtp_password")} name="email_smtp_password" formik={formik} />
      <Typography variant="subtitle2">{t("settings.email.invitationTemplates")}</Typography>
      <Select
        label={t("settings.language")}
        multiple={false}
        value={language}
        onChange={(value) => (value != null ? setLanguage(value as Language) : null)}
        options={supportedInvitationLanguages}
        formatOption={(option: Language) => option}
      />
      <TextField
        label={t("settings.email.invitation_subject")}
        name={`invitation_texts.${language}.subject`}
        value={templates["subject"] ?? ""}
        onChange={(event) => {
          formik.setFieldValue(
            "invitation_texts",
            updateInvitationTexts(formik.values.invitation_texts, language, "subject", event.target.value)
          );
          formik.setFieldTouched("invitation_texts");
        }}
        variant="standard"
        fullWidth
      />
      <TextField
        label={t("settings.email.invitation_text_body")}
        name={`invitation_texts.${language}.text_body`}
        value={templates["text_body"] ?? ""}
        onChange={(event) => {
          formik.setFieldValue(
            "invitation_texts",
            updateInvitationTexts(formik.values.invitation_texts, language, "text_body", event.target.value)
          );
          formik.setFieldTouched("invitation_texts");
        }}
        multiline
        minRows={8}
        variant="standard"
        fullWidth
      />
      <TextField
        label={t("settings.email.invitation_html_body")}
        name={`invitation_texts.${language}.html_body`}
        value={templates["html_body"] ?? ""}
        onChange={(event) => {
          formik.setFieldValue(
            "invitation_texts",
            updateInvitationTexts(formik.values.invitation_texts, language, "html_body", event.target.value)
          );
          formik.setFieldTouched("invitation_texts");
        }}
        multiline
        minRows={10}
        variant="standard"
        fullWidth
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
    updateGlobalEmailConfig({
      globalEmailConfig: {
        ...values,
        invitation_texts: normalizeInvitationTexts(values.invitation_texts),
      } as GlobalEmailConfig,
    })
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
