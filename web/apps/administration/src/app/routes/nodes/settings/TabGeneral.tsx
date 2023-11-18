import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormNumericInput, FormTextField } from "@stustapay/form-components";
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

export const TabGeneral: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: GeneralSettings, { setSubmitting }: FormikHelpers<GeneralSettings>) => {
    console.log("foobar");
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
      initialValues={eventSettings as GeneralSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(GeneralSettingsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormTextField
              label={t("settings.general.currency_identifier")}
              name="currency_identifier"
              formik={formik}
            />
            <FormNumericInput
              label={t("settings.general.max_account_balance")}
              name="max_account_balance"
              formik={formik}
            />
            <FormTextField label={t("settings.general.ust_id")} name="ust_id" formik={formik} />
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              onClick={() => formik.handleSubmit()}
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
