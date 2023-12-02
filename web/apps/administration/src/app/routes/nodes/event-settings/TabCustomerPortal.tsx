import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

export const CustomerPortalSettingsSchema = z.object({
  customer_portal_url: z.string().url(),
  customer_portal_contact_email: z.string(),
  customer_portal_about_page_url: z.string().url(),
  customer_portal_data_privacy_url: z.string().url(),
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
      initialValues={eventSettings as CustomerPortalSettings} // TODO: figure out a way of not needing to cast this
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
