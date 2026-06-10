import { Button, LinearProgress, Stack } from "@mui/material";
import { FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";

const requiredIssue = {
  code: "custom",
  message: "Required when Headwind MDM is selected",
} as const;

export const MdmSettingsSchema = z
  .object({
    headwind_enabled: z.boolean(),
    headwind_url: z.string().optional().nullable(),
    headwind_username: z.string().optional().nullable(),
    headwind_password: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.headwind_enabled) {
      return;
    }
    if (!data.headwind_url) {
      ctx.addIssue({ ...requiredIssue, path: ["headwind_url"] });
    }
    if (!data.headwind_username) {
      ctx.addIssue({ ...requiredIssue, path: ["headwind_username"] });
    }
    if (!data.headwind_password) {
      ctx.addIssue({ ...requiredIssue, path: ["headwind_password"] });
    }
  });

export type MdmSettings = z.infer<typeof MdmSettingsSchema>;

const toMdmSettings = (eventSettings: RestrictedEventSettings): MdmSettings => ({
  headwind_enabled: eventSettings.headwind_enabled ?? false,
  headwind_url: eventSettings.headwind_url ?? "",
  headwind_username: eventSettings.headwind_username ?? "",
  headwind_password: eventSettings.headwind_password ?? "",
});

export const MdmSettingsForm: React.FC<FormikProps<MdmSettings>> = (formik) => {
  const { t } = useTranslation();

  return (
    <>
      <FormSwitch label={t("settings.mdm.headwindEnabled")} name="headwind_enabled" formik={formik} />
      <FormTextField label={t("settings.mdm.headwindUrl")} name="headwind_url" formik={formik} />
      <FormTextField label={t("settings.mdm.headwindUsername")} name="headwind_username" formik={formik} />
      <FormTextField
        label={t("settings.mdm.headwindPassword")}
        name="headwind_password"
        type="password"
        formik={formik}
      />
    </>
  );
};

export const TabMdm: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: MdmSettings, { setSubmitting }: FormikHelpers<MdmSettings>) => {
    setSubmitting(true);
    updateEvent({ nodeId, updateEvent: { ...eventSettings, ...values } })
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
    <Stack spacing={2}>
      <Formik
        initialValues={toMdmSettings(eventSettings)}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(MdmSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <MdmSettingsForm {...formik} />
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
    </Stack>
  );
};
