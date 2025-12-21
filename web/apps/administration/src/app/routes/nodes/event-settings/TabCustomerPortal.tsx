import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, FormControlLabel, LinearProgress, Stack, Switch } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

export const CustomerPortalSettingsSchema = z.object({
  customer_portal_url: z.string().url(),
  customer_portal_contact_email: z.string().email(),
  customer_portal_about_page_url: z.string().url(),
  customer_portal_data_privacy_url: z.string().url(),
  donation_enabled: z.boolean(),
});

export type CustomerPortalSettings = z.infer<typeof CustomerPortalSettingsSchema>;

export const CustomerPortalSettingsForm: React.FC<FormikProps<CustomerPortalSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField label={t("settings.customerPortal.baseUrl")} name="customer_portal_url" formik={formik} />
      <FormTextField
        label={t("settings.customerPortal.contact_email")}
        name="customer_portal_contact_email"
        formik={formik}
      />
      <FormTextField
        label={t("settings.customerPortal.about_page_url")}
        name="customer_portal_about_page_url"
        formik={formik}
      />
      <FormTextField
        label={t("settings.customerPortal.data_privacy_url")}
        name="customer_portal_data_privacy_url"
        formik={formik}
      />
      <FormControlLabel
        control={
          <Switch
            checked={formik.values.donation_enabled}
            onChange={(event) => {
              formik.setFieldValue("donation_enabled", event.target.checked);
              formik.setFieldTouched("donation_enabled", true);
            }}
            name="donation_enabled"
            color="primary"
          />
        }
        label={t("settings.customerPortal.donation_enabled")}
      />
    </>
  );
};

export const TabCustomerPortal: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: CustomerPortalSettings, { setSubmitting }: FormikHelpers<CustomerPortalSettings>) => {
    setSubmitting(true);
    console.log("Submitting values:", values);
    console.log("donation_enabled value:", values.donation_enabled);
    console.log("Update payload:", { ...eventSettings, ...values });
    updateEvent({ nodeId: nodeId, updateEvent: { ...eventSettings, ...values } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.updateEventSucessful"));
      })
      .catch((err) => {
        setSubmitting(false);
        console.error("Error updating event:", err);
        toast.error(t("settings.updateEventFailed", { reason: err.error }));
      });
  };
  
  // Create a properly typed initial values object from the event settings
  const initialValues: CustomerPortalSettings = {
    customer_portal_url: eventSettings.customer_portal_url,
    customer_portal_contact_email: eventSettings.customer_portal_contact_email,
    customer_portal_about_page_url: eventSettings.customer_portal_about_page_url,
    customer_portal_data_privacy_url: eventSettings.customer_portal_data_privacy_url,
    donation_enabled: eventSettings.donation_enabled ?? true
  };
  
  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(CustomerPortalSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <CustomerPortalSettingsForm {...formik} />
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={formik.isSubmitting || !formik.dirty}
            >
              {t("save")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
