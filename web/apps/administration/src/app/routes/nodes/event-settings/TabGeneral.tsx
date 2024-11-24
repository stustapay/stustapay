import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, InputAdornment, LinearProgress, Stack } from "@mui/material";
import { FormNumericInput, FormTextField, FormDateTimePicker, FormTimePicker } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { CurrencyIdentifierSelect } from "@/components/features";
import { CurrencyIdentifierSchema, getCurrencySymbolForIdentifier } from "@stustapay/models";
import i18n from "@/i18n";

const GeneralSettingsSchema = z
  .object({
    currency_identifier: CurrencyIdentifierSchema,
    max_account_balance: z.number(),
    ust_id: z.string(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    daily_end_time: z.string().optional().nullable(), // TODO: validation
  })
  .refine(
    (values) => {
      console.log(values);
      return (
        (values.start_date == null) === (values.end_date == null) &&
        (values.start_date === "") === (values.end_date === "")
      );
    },
    { message: i18n.t("settings.general.start_end_date_must_be_set_same"), path: ["end_date"] }
  );

type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

export const TabGeneral: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: GeneralSettings, { setSubmitting }: FormikHelpers<GeneralSettings>) => {
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
            <CurrencyIdentifierSelect
              label={t("settings.general.currency_identifier")}
              value={formik.values.currency_identifier}
              onChange={(val) => {
                formik.setFieldValue("currency_identifier", val);
                formik.setFieldTouched("currency_identifier");
              }}
              error={formik.touched.currency_identifier && !!formik.errors.currency_identifier}
              helperText={(formik.touched.currency_identifier && formik.errors.currency_identifier) as string}
            />
            <FormNumericInput
              label={t("settings.general.max_account_balance")}
              name="max_account_balance"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {getCurrencySymbolForIdentifier(formik.values.currency_identifier)}
                    </InputAdornment>
                  ),
                },
              }}
              formik={formik}
            />
            <FormTextField label={t("settings.general.ust_id")} name="ust_id" formik={formik} />
            <FormDateTimePicker name="start_date" formik={formik} label={t("settings.general.start_date")} />
            <FormDateTimePicker name="end_date" formik={formik} label={t("settings.general.end_date")} />
            <FormTimePicker name="daily_end_time" formik={formik} label={t("settings.general.daily_end_time")} />
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
