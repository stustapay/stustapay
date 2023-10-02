import { Event, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack, TextField } from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const GeneralSettingsSchema = z.object({
  currency_identifier: z.literal("EUR"),
  max_account_balance: z.number(),
  ust_id: z.string(),
});

type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

export const TabGeneral: React.FC<{ nodeId: number; event: Event }> = ({ nodeId, event }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: GeneralSettings, { setSubmitting }: FormikHelpers<GeneralSettings>) => {
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
      initialValues={event as GeneralSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(GeneralSettingsSchema)}
    >
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched }) => (
        <Form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label={t("settings.general.currency_identifier")}
              name="currency_identifier"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.currency_identifier}
              error={touched.currency_identifier && !!errors.currency_identifier}
              helperText={(touched.currency_identifier && errors.currency_identifier) as string}
            />
            <TextField
              label={t("settings.general.max_account_balance")}
              name="max_account_balance"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.max_account_balance}
              error={touched.max_account_balance && !!errors.max_account_balance}
              helperText={(touched.max_account_balance && errors.max_account_balance) as string}
            />
            <TextField
              label={t("settings.general.ust_id")}
              name="ust_id"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.ust_id}
              error={touched.ust_id && !!errors.ust_id}
              helperText={(touched.ust_id && errors.ust_id) as string}
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
