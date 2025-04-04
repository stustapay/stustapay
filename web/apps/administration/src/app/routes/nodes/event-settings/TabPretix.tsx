import {
  PretixProduct,
  RestrictedEventSettings,
  useCheckPretixConnectionMutation,
  useFetchPretixProductsMutation,
  useGenerateWebhookUrlMutation,
  useUpdateEventMutation,
} from "@/api";
import { ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { Button, IconButton, LinearProgress, ListItem, ListItemText, Stack } from "@mui/material";
import { FormSelect, FormSwitch, FormTextField } from "@stustapay/form-components";
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

const PretixProductSelect: React.FC<{ nodeId: number; formik: FormikProps<PretixSettings> }> = ({ nodeId, formik }) => {
  const { t, i18n } = useTranslation();
  const languageBaseCode = i18n.language.split("-")[0];
  const [products, setProducts] = React.useState<PretixProduct[]>([]);
  const productIds = products.map((p) => p.id);
  const [fetchProducts] = useFetchPretixProductsMutation();

  const pretixApiKey = formik.values.pretix_api_key;
  const pretixUrl = formik.values.pretix_shop_url;
  const pretixOrganizer = formik.values.pretix_organizer;
  const pretixEvent = formik.values.pretix_event;

  React.useEffect(() => {
    if (!pretixUrl || !pretixApiKey || !pretixOrganizer || !pretixEvent) {
      return;
    }

    fetchProducts({
      nodeId,
      pretixFetchProductsPayload: {
        apiKey: pretixApiKey,
        organizer: pretixOrganizer,
        event: pretixEvent,
        url: pretixUrl,
      },
    }).then((resp) => {
      if (resp.data) {
        setProducts(resp.data);
      } else {
        toast.error("Failed to fetch pretix products");
      }
    });
  }, [pretixApiKey, pretixUrl, pretixOrganizer, pretixEvent, fetchProducts, nodeId]);

  return (
    <FormSelect
      name="pretix_ticket_ids"
      label={t("settings.pretix.ticketIds")}
      formik={formik}
      options={productIds}
      multiple={true}
      checkboxes={true}
      formatOption={(productId) => {
        const product = products.find((p) => p.id === productId);
        const name = product?.name[languageBaseCode] ?? "";
        return name;
      }}
    />
  );
};

export const PretixSettingsForm: React.FC<{ nodeId: number; formik: FormikProps<PretixSettings> }> = ({
  nodeId,
  formik,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <FormSwitch label={t("settings.pretix.presaleEnabled")} name="pretix_presale_enabled" formik={formik} />
      <FormTextField label={t("settings.pretix.baseUrl")} name="pretix_shop_url" formik={formik} />
      <FormTextField label={t("settings.pretix.apiKey")} name="pretix_api_key" formik={formik} />
      <FormTextField label={t("settings.pretix.organizer")} name="pretix_organizer" formik={formik} />
      <FormTextField label={t("settings.pretix.event")} name="pretix_event" formik={formik} />
      <PretixProductSelect nodeId={nodeId} formik={formik} />
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
  const [generateWebhook] = useGenerateWebhookUrlMutation();
  const [webhookUrl, setWebhookUrl] = React.useState("");

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

  const handleGenerateWebhook = () => {
    generateWebhook({ generateWebhookPayload: { webhook_type: "pretix" }, nodeId }).then((resp) => {
      if (resp.data) {
        setWebhookUrl(resp.data.webhook_url);
        toast.success(t("settings.pretix.webhookGenerated"));
      } else {
        toast.error(t("settings.pretix.webhookUrlFailed"));
      }
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
              <PretixSettingsForm nodeId={nodeId} formik={formik} />
              <Button color="primary" variant="outlined" onClick={handleGenerateWebhook}>
                {t("settings.pretix.generateWebhook")}
              </Button>
              {webhookUrl && (
                <ListItem
                  secondaryAction={
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast.success(t("common.copiedToClipboard"));
                      }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary="Pretix webhook" secondary={webhookUrl} />
                </ListItem>
              )}
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
