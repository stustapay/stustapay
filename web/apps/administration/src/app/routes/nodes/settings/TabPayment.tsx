import { Event, useUpdateEventMutation } from "@/api";
import {
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import iban from "iban";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const PaymentSettingsSchema = z.object({
  sepa_enabled: z.boolean(),
  sepa_sender_name: z.string(),
  sepa_sender_iban: z.string(),
  sepa_description: z.string(),
  sepa_allowed_country_codes: z.array(z.string()).min(1),
});

type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

export const TabPayment: React.FC<{ nodeId: number; event: Event }> = ({ nodeId, event }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: PaymentSettings, { setSubmitting }: FormikHelpers<PaymentSettings>) => {
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
      initialValues={event as PaymentSettings} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(PaymentSettingsSchema)}
    >
      {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched, setFieldValue }) => (
        <Form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl component="fieldset" variant="standard">
              <Stack spacing={2}>
                <FormLabel component="legend">{t("settings.payment.sumup_settings_title")}</FormLabel>
                <TextField label="SumUp API Key" value="" />
              </Stack>
            </FormControl>
            <FormControl component="fieldset" variant="standard">
              <Stack spacing={2}>
                <FormLabel component="legend">{t("settings.payment.payout_settings_title")}</FormLabel>
                <TextField
                  label={t("settings.payment.sepa_sender_name")}
                  name="sepa_sender_name"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.sepa_sender_name}
                  error={touched.sepa_sender_name && !!errors.sepa_sender_name}
                  helperText={(touched.sepa_sender_name && errors.sepa_sender_name) as string}
                />
                <TextField
                  label={t("settings.payment.sepa_sender_iban")}
                  name="sepa_sender_iban"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.sepa_sender_iban}
                  error={touched.sepa_sender_iban && !!errors.sepa_sender_iban}
                  helperText={(touched.sepa_sender_iban && errors.sepa_sender_iban) as string}
                />
                <TextField
                  label={t("settings.payment.sepa_description")}
                  name="sepa_description"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.sepa_description}
                  error={touched.sepa_description && !!errors.sepa_description}
                  helperText={(touched.sepa_description && errors.sepa_description) as string}
                />
                <FormControl error={touched.sepa_allowed_country_codes && !!errors.sepa_allowed_country_codes}>
                  <InputLabel id="country-code-select-label">
                    {t("settings.payment.sepa_allowed_country_codes")}
                  </InputLabel>
                  <Select
                    labelId="country-code-select-label"
                    multiple
                    name="sepa_allowed_country_codes"
                    value={values.sepa_allowed_country_codes}
                    onChange={(ev) =>
                      setFieldValue(
                        "sepa_allowed_country_codes",
                        typeof ev.target.value === "string" ? ev.target.value.split(",") : ev.target.value
                      )
                    }
                    onBlur={handleBlur}
                    renderValue={(selected) => selected.join(", ")}
                    input={<OutlinedInput label={t("settings.payment.sepa_allowed_country_codes")} />}
                  >
                    {Object.keys(iban.countries).map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={values.sepa_allowed_country_codes.includes(name)} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.sepa_allowed_country_codes && errors.sepa_allowed_country_codes && (
                    <FormHelperText>{errors.sepa_allowed_country_codes}</FormHelperText>
                  )}
                </FormControl>
              </Stack>
            </FormControl>

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
