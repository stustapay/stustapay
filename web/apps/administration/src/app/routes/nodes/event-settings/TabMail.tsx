import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormSwitch, FormTextField } from "@stustapay/form-components";
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

export const MailSettingsSchema = z
  .object({
    email_enabled: z.boolean(),
    email_default_sender: z.string().email().optional().nullable(),
    email_smtp_host: z.string().optional().nullable(),
    email_smtp_port: z.number().int().optional().nullable(),
    email_smtp_username: z.string().optional().nullable(),
    email_smtp_password: z.string().optional().nullable(),
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

export type MailSettings = z.infer<typeof MailSettingsSchema>;

export const MailSettingsForm: React.FC<FormikProps<MailSettings>> = (formik) => {
  const { t } = useTranslation();

  return (
    <>
      <FormSwitch label={t("settings.email.enabled")} name="email_enabled" formik={formik} />
      <FormTextField label={t("settings.email.default_sender")} name="email_default_sender" formik={formik} />
      <FormTextField label={t("settings.email.smtp_host")} name="email_smtp_host" formik={formik} />
      <FormTextField label={t("settings.email.smtp_port")} name="email_smtp_port" formik={formik} />
      <FormTextField label={t("settings.email.smtp_username")} name="email_smtp_username" formik={formik} />
      <FormTextField label={t("settings.email.smtp_password")} name="email_smtp_password" formik={formik} />
    </>
  );
};

export const TabMail: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: MailSettings, { setSubmitting }: FormikHelpers<MailSettings>) => {
    setSubmitting(true);
    console.log("submitting");
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

  return (
    <Formik
      initialValues={eventSettings as MailSettings}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(MailSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <MailSettingsForm {...formik} />
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              onClick={() => formik.handleSubmit()}
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
