import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const SumUpSettingsSchema = z.object({
  sumup_topup_enabled: z.boolean(),
  sumup_payment_enabled: z.boolean(),
  sumup_api_key: z.string(),
  sumup_affiliate_key: z.string(),
  sumup_merchant_code: z.string(),
});

type SumUpSettings = z.infer<typeof SumUpSettingsSchema>;

export const TabSumUp: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

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

  return (
    <Formik
      initialValues={eventSettings as SumUpSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(SumUpSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormSwitch label={t("settings.sumup.sumup_topup_enabled")} name="sumup_topup_enabled" formik={formik} />
            <FormSwitch
              label={t("settings.sumup.sumup_payment_enabled")}
              name="sumup_payment_enabled"
              formik={formik}
            />
            <FormTextField label={t("settings.sumup.sumup_affiliate_key")} name="sumup_affiliate_key" formik={formik} />
            <FormTextField label={t("settings.sumup.sumup_api_key")} name="sumup_api_key" formik={formik} />
            <FormTextField label={t("settings.sumup.sumup_merchant_code")} name="sumup_merchant_code" formik={formik} />

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
