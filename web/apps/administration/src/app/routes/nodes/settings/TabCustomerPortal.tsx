import { Event, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack, TextField } from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const CustomerPortalSettingsSchema = z.object({
  customer_portal_contact_email: z.string(),
});

type CustomerPortalSettings = z.infer<typeof CustomerPortalSettingsSchema>;

export const TabCustomerPortal: React.FC<{ nodeId: number; event: Event }> = ({ nodeId, event }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: CustomerPortalSettings, { setSubmitting }: FormikHelpers<CustomerPortalSettings>) => {
    setSubmitting(true);
    updateEvent({ nodeId: nodeId, updateEvent: { ...event, ...values } })
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
      initialValues={event as CustomerPortalSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(CustomerPortalSettingsSchema)}
    >
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched, setFieldValue }) => (
        <Form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label={t("settings.customerPortal.contact_email")}
              name="customer_portal_contact_email"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.customer_portal_contact_email}
              error={touched.customer_portal_contact_email && !!errors.customer_portal_contact_email}
              helperText={(touched.customer_portal_contact_email && errors.customer_portal_contact_email) as string}
            />

            {isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={isSubmitting || Object.keys(touched).length === 0}
            >
              {t("save")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
