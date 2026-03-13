import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import {
  Button,
  InputAdornment,
  LinearProgress,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  FormNumericInput,
  FormTextField,
  FormDateTimePicker,
  FormTimePicker,
} from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { CurrencyIdentifierSelect } from "@/components/features";
import {
  CurrencyIdentifierSchema,
  getCurrencySymbolForIdentifier,
} from "@stustapay/models";
import i18n from "@/i18n";

const GeneralSettingsSchema = z
  .object({
    currency_identifier: CurrencyIdentifierSchema,
    max_account_balance: z.number(),
    vip_max_account_balance: z.number(),
    ust_id: z.string(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    daily_end_time: z.string().optional().nullable(),
    expected_visitors_per_day: z.number().optional().nullable(),
    post_payment_allowed: z.boolean(),
  })
  .refine(
    (values) => {
      return (
        (values.start_date == null) === (values.end_date == null) &&
        (values.start_date === "") === (values.end_date === "")
      );
    },
    {
      message: i18n.t("settings.general.start_end_date_must_be_set_same"),
      path: ["end_date"],
    }
  );

type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

export const TabGeneral: React.FC<{
  nodeId: number;
  eventSettings: RestrictedEventSettings;
}> = ({ nodeId, eventSettings }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (
    values: GeneralSettings,
    { setSubmitting }: FormikHelpers<GeneralSettings>
  ) => {
    setSubmitting(true);
    console.log('Submitting values:', values);
    // Ensure values overwrite eventSettings
    const updateData = {
      ...eventSettings,
      ...values,
    };
    updateEvent({ nodeId: nodeId, updateEvent: updateData })
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

  // Initialize vip_max_account_balance if it doesn't exist in eventSettings
  const initialValues = {
    ...eventSettings,
    // Use type assertion since the field exists in the backend but is missing from the TypeScript definition
    vip_max_account_balance: (eventSettings as any).vip_max_account_balance ?? 300,
  } as GeneralSettings;

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(GeneralSettingsSchema)}
      enableReinitialize={false} // Set to false to prevent re-initialization
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {getCurrencySymbolForIdentifier(
                      formik.values.currency_identifier
                    )}
                  </InputAdornment>
                ),
              }}
              formik={formik}
            />
            <FormNumericInput
              label={t("settings.general.vip_max_account_balance")}
              name="vip_max_account_balance"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {getCurrencySymbolForIdentifier(
                      formik.values.currency_identifier
                    )}
                  </InputAdornment>
                ),
              }}
              formik={formik}
            />
            <FormTextField
              label={t("settings.general.ust_id")}
              name="ust_id"
              formik={formik}
            />
            <FormDateTimePicker
              name="start_date"
              formik={formik}
              label={t("settings.general.start_date")}
            />
            <FormDateTimePicker
              name="end_date"
              formik={formik}
              label={t("settings.general.end_date")}
            />
            <FormTimePicker
              name="daily_end_time"
              formik={formik}
              label={t("settings.general.daily_end_time")}
            />
            <FormNumericInput
              label={t("settings.general.expected_visitors_per_day")}
              name="expected_visitors_per_day"
              formik={formik}
            />
            {/* Toggle Button */}
            <FormControlLabel
              control={
                <Switch
                  checked={formik.values.post_payment_allowed}
                  onChange={(event) =>
                    formik.setFieldValue(
                      "post_payment_allowed",
                      event.target.checked
                    )
                  }
                  name="post_payment_allowed"
                  color="primary"
                />
              }
              label={t("settings.general.post_payment_allowed")}
            />
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              onClick={() => formik.handleSubmit()}
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
