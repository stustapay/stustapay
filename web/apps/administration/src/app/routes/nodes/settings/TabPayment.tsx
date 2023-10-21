import { PublicEventSettings, useUpdateEventMutation } from "@/api";
import { Button, FormControl, FormLabel, LinearProgress, Stack } from "@mui/material";
import { FormSelect, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import iban from "iban";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const PaymentSettingsSchema = z.object({
  // sumup_api_key: z.string(),
  sepa_enabled: z.boolean(),
  sepa_sender_name: z.string(),
  sepa_sender_iban: z.string(),
  sepa_description: z.string(),
  sepa_allowed_country_codes: z.array(z.string()).min(1),
});

type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

export const TabPayment: React.FC<{ nodeId: number; eventSettings: PublicEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: PaymentSettings, { setSubmitting }: FormikHelpers<PaymentSettings>) => {
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
      initialValues={eventSettings as PaymentSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(PaymentSettingsSchema)}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormControl component="fieldset" variant="standard">
              <Stack spacing={2}>
                <FormLabel component="legend">{t("settings.payment.sumup_settings_title")}</FormLabel>
                <FormTextField label="SumUp API Key" name="sumup_api_key" formik={formik} />
              </Stack>
            </FormControl>
            <FormControl component="fieldset" variant="standard">
              <Stack spacing={2}>
                <FormLabel component="legend">{t("settings.payment.payout_settings_title")}</FormLabel>
                <FormTextField label={t("settings.payment.sepa_sender_name")} name="sepa_sender_name" formik={formik} />
                <FormTextField label={t("settings.payment.sepa_sender_iban")} name="sepa_sender_iban" formik={formik} />
                <FormTextField label={t("settings.payment.sepa_description")} name="sepa_description" formik={formik} />
                <FormSelect
                  label={t("settings.payment.sepa_allowed_country_codes")}
                  multiple={true}
                  name="sepa_allowed_country_codes"
                  formik={formik}
                  options={Object.keys(iban.countries)}
                  getOptionKey={(iban) => iban}
                  formatOption={(iban) => iban}
                />
              </Stack>
            </FormControl>

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
