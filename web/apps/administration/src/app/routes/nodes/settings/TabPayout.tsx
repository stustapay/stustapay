import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormSelect, FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import iban from "iban";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

export const TabPayout: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: PayoutSettings, { setSubmitting }: FormikHelpers<PayoutSettings>) => {
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
  const PayoutSettingsSchema = z.object({
    sepa_enabled: z.boolean(),
    sepa_sender_name: z.string(),
    sepa_sender_iban: z.string().superRefine((val, ctx) => {
      if (!iban.isValid(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("settings.payout.ibanNotValid"),
        });
      }
    }),
    sepa_description: z.string(),
    sepa_allowed_country_codes: z.array(z.string()).min(1),
  });
  type PayoutSettings = z.infer<typeof PayoutSettingsSchema>;

  return (
    <Formik
      initialValues={eventSettings as PayoutSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(PayoutSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormSwitch label={t("settings.payout.sepa_enabled")} name="sepa_enabled" formik={formik} />
            <FormTextField label={t("settings.payout.sepa_sender_name")} name="sepa_sender_name" formik={formik} />
            <FormTextField label={t("settings.payout.sepa_sender_iban")} name="sepa_sender_iban" formik={formik} />
            <FormTextField label={t("settings.payout.sepa_description")} name="sepa_description" formik={formik} />
            <FormSelect
              label={t("settings.payout.sepa_allowed_country_codes")}
              multiple={true}
              name="sepa_allowed_country_codes"
              checkboxes={true}
              formik={formik}
              options={Object.keys(iban.countries)}
              formatOption={(iban) => iban}
            />

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
