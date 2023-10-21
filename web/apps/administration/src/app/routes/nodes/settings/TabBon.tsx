import { PublicEventSettings, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
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

export const TabBon: React.FC<{ nodeId: number; eventSettings: PublicEventSettings }> = ({ nodeId, eventSettings }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: BonSettings, { setSubmitting }: FormikHelpers<BonSettings>) => {
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
      initialValues={eventSettings as BonSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(BonSettingsSchema)}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <FormTextField label={t("settings.bon.title")} name="bon_title" formik={formik} />
            <FormTextField label={t("settings.bon.issuer")} name="bon_issuer" formik={formik} />
            <FormTextField label={t("settings.bon.address")} name="bon_address" formik={formik} />
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
