import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { useListHeadwindMappingsQuery } from "@/api/mdm";
import { Alert, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ConnectivitySettings, ConnectivitySettingsSchema } from "./TabMdm.schema";

export const TabMdm: React.FC<{
  nodeId: number;
  eventSettings: RestrictedEventSettings;
}> = ({ nodeId, eventSettings }) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();
  const { refetch: refetchMappings } = useListHeadwindMappingsQuery({ nodeId });

  const handleSubmit = async (
    values: ConnectivitySettings,
    { setSubmitting }: FormikHelpers<ConnectivitySettings>
  ) => {
    setSubmitting(true);
    try {
      await updateEvent({
        nodeId,
        updateEvent: {
          ...eventSettings,
          ...values,
        },
      }).unwrap();

      toast.success(t("settings.updateEventSucessful"));

      const mappingsResult = await refetchMappings();
      const failedMappings =
        mappingsResult.data?.filter((mapping) => mapping.last_wifi_push_status === "error") ?? [];
      if (failedMappings.length > 0) {
        toast.warning(t("settings.mdm.syncWarning", { count: failedMappings.length }));
      }
    } catch (err: any) {
      toast.error(t("settings.updateEventFailed", { reason: err?.error ?? err?.message ?? "unknown error" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik<ConnectivitySettings>
      initialValues={{
        wifi_ssid: eventSettings.wifi_ssid ?? "",
        wifi_passphrase: eventSettings.wifi_passphrase ?? "",
      }}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(ConnectivitySettingsSchema)}
      enableReinitialize={false}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <Alert severity="info">{t("settings.mdm.headwindOnlyNotice")}</Alert>
            <Typography variant="body2" color="text.secondary">
              {t("settings.mdm.description")}
            </Typography>
            <FormTextField
              label={t("settings.mdm.wifiSsid")}
              name="wifi_ssid"
              formik={formik}
            />
            <FormTextField
              label={t("settings.mdm.wifiPassphrase")}
              name="wifi_passphrase"
              type="password"
              formik={formik}
            />
            {formik.isSubmitting && <LinearProgress />}
            <Button type="submit" color="primary" variant="contained" disabled={formik.isSubmitting || !formik.dirty}>
              {t("save")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
