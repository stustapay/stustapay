import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, FormControl, FormHelperText, LinearProgress, Stack, TextField } from "@mui/material";
import { FormSelect, FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import iban from "iban";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { updateTranslationTexts } from "./common";
import { PayoutSettings, PayoutSettingsSchema } from "./TabPayout.schema";

export const PayoutSettingsForm: React.FC<FormikProps<PayoutSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
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
      <FormTextField label={t("settings.payout.payout_done_subject")} name="payout_done_subject" formik={formik} />
      <FormTextField
        label={t("settings.payout.payout_done_message")}
        name="payout_done_message"
        multiline
        formik={formik}
      />
      <FormTextField
        label={t("settings.payout.payout_registered_subject")}
        name="payout_registered_subject"
        formik={formik}
      />
      <FormTextField
        label={t("settings.payout.payout_registered_message")}
        name="payout_registered_message"
        multiline
        formik={formik}
      />
      <FormTextField label={t("settings.payout.payout_sender")} name="payout_sender" formik={formik} />
      <FormControl error={!!formik.errors.translation_texts}>
        <TextField
          label={t("settings.payout.payout_disabled_notice_de")}
          variant="standard"
          fullWidth
          multiline
          minRows={4}
          value={formik.values.translation_texts["de-DE"]?.["payout_disabled_notice"] ?? ""}
          onChange={(evt) => {
            const newSettings = updateTranslationTexts(
              formik.values.translation_texts,
              "de-DE",
              "payout_disabled_notice",
              evt.target.value
            );
            formik.setFieldValue("translation_texts", newSettings);
            formik.setFieldTouched("translation_texts");
          }}
        />
        <TextField
          label={t("settings.payout.payout_disabled_notice_en")}
          variant="standard"
          fullWidth
          multiline
          minRows={4}
          value={formik.values.translation_texts["en-US"]?.["payout_disabled_notice"] ?? ""}
          onChange={(evt) => {
            const newSettings = updateTranslationTexts(
              formik.values.translation_texts,
              "en-US",
              "payout_disabled_notice",
              evt.target.value
            );
            formik.setFieldValue("translation_texts", newSettings);
            formik.setFieldTouched("translation_texts");
          }}
        />
        <FormHelperText>{t("settings.payout.payout_disabled_notice_help")}</FormHelperText>
        {!!formik.errors.translation_texts && <FormHelperText>{String(formik.errors.translation_texts)}</FormHelperText>}
      </FormControl>
    </>
  );
};

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
            <PayoutSettingsForm {...formik} />
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
