import { Event, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack, TextField } from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const BonSettingsSchema = z.object({
  bon_title: z.string(),
  bon_issuer: z.string(),
  bon_address: z.string(),
});

type BonSettings = z.infer<typeof BonSettingsSchema>;

export const TabBon: React.FC<{ nodeId: number; event: Event }> = ({ nodeId, event }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: BonSettings, { setSubmitting }: FormikHelpers<BonSettings>) => {
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
      initialValues={event as BonSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(BonSettingsSchema)}
    >
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched }) => (
        <Form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label={t("settings.bon.title")}
              name="bon_title"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.bon_title}
              error={touched.bon_title && !!errors.bon_title}
              helperText={(touched.bon_title && errors.bon_title) as string}
            />
            <TextField
              label={t("settings.bon.issuer")}
              name="bon_issuer"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.bon_issuer}
              error={touched.bon_issuer && !!errors.bon_issuer}
              helperText={(touched.bon_issuer && errors.bon_issuer) as string}
            />
            <TextField
              label={t("settings.bon.address")}
              name="bon_address"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.bon_address}
              error={touched.bon_address && !!errors.bon_address}
              helperText={(touched.bon_address && errors.bon_address) as string}
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
