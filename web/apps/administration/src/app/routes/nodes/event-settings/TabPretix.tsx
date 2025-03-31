import { RestrictedEventSettings, useCheckPretixConnectionMutation, useUpdateEventMutation } from "@/api";
import { Button, LinearProgress, Stack } from "@mui/material";
import { ArrayTextInput } from "@stustapay/components";
import { FormSwitch, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const requiredIssue = {
  code: z.ZodIssueCode.custom,
  message: "Required if pretix presale is enabled",
};

export const PretixSettingsSchema = z
  .object({
    pretix_presale_enabled: z.boolean(),
    pretix_shop_url: z.string().optional().nullable(),
    pretix_api_key: z.string().optional().nullable(),
    pretix_organizer: z.string().optional().nullable(),
    pretix_event: z.string().optional().nullable(),
    pretix_ticket_ids: z.array(z.number().int()).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.pretix_presale_enabled) {
      return;
    }
    if (data.pretix_shop_url === "") {
      ctx.addIssue({ ...requiredIssue, path: ["pretix_shop_url"] });
    }
    if (data.pretix_api_key === "") {
      ctx.addIssue({ ...requiredIssue, path: ["pretix_api_key"] });
    }
    if (data.pretix_organizer === "") {
      ctx.addIssue({ ...requiredIssue, path: ["pretix_organizer"] });
    }
    if (data.pretix_event === "") {
      ctx.addIssue({ ...requiredIssue, path: ["pretix_event"] });
    }
    if (data.pretix_ticket_ids == null) {
      ctx.addIssue({ ...requiredIssue, path: ["pretix_ticket_ids"] });
    }
  });

export type PretixSettings = z.infer<typeof PretixSettingsSchema>;

export const PretixSettingsForm: React.FC<FormikProps<PretixSettings>> = (formik) => {
  const { t } = useTranslation();

  return (
    <>
      <FormSwitch label={t("settings.pretix.presaleEnabled")} name="pretix_presale_enabled" formik={formik} />
      <FormTextField label={t("settings.pretix.baseUrl")} name="pretix_shop_url" formik={formik} />
      <FormTextField label={t("settings.pretix.apiKey")} name="pretix_api_key" formik={formik} />
      <FormTextField label={t("settings.pretix.organizer")} name="pretix_organizer" formik={formik} />
      <FormTextField label={t("settings.pretix.event")} name="pretix_event" formik={formik} />
      <ArrayTextInput
        label={t("settings.pretix.ticketIds")}
        name="pretix_ticket_ids"
        variant={"standard"}
        fullWidth={true}
        onChange={(value) => {
          formik.setFieldValue("pretix_ticket_ids", value);
          formik.setFieldTouched("pretix_ticket_ids");
        }}
        value={formik.values.pretix_ticket_ids}
        error={formik.touched.pretix_ticket_ids && !!formik.errors.pretix_ticket_ids}
        helperText={(formik.touched.pretix_ticket_ids && formik.errors.pretix_ticket_ids) as string}
      />
    </>
  );
};

export const TabPretix: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();
  const [checkConnection] = useCheckPretixConnectionMutation();

  const handleSubmit = (values: PretixSettings, { setSubmitting }: FormikHelpers<PretixSettings>) => {
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

  const checkPretixConnection = () => {
    checkConnection({ nodeId }).then((resp) => {
      if (resp.error) {
        toast.error(t("settings.pretix.checkFailed"));
      } else {
        toast.success(t("settings.pretix.checkSuccessful"));
      }
    });
  };

  return (
    <Stack spacing={2}>
      <Formik
        initialValues={eventSettings as PretixSettings} // TODO: figure out a way of not needing to cast this
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(PretixSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <PretixSettingsForm {...formik} />
              <Button color="primary" variant="outlined" onClick={checkPretixConnection}>
                {t("settings.pretix.checkConnection")}
              </Button>
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
    </Stack>
  );
};
