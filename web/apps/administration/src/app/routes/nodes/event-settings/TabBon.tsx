import {
  BonJsonRead,
  RestrictedEventSettings,
  useGenerateTestBonMutation,
  useGenerateTestRevenueReportMutation,
  useGetEventDesignQuery,
  useUpdateEventMutation,
} from "@/api";
import { Button, LinearProgress, Stack, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { FormTextField } from "@stustapay/form-components";
import { BonDisplay } from "@stustapay/components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import { Receipt as ReceiptIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { getBlobUrl } from "@/core/blobs";

export const BonSettingsSchema = z.object({
  bon_title: z.string(),
  bon_issuer: z.string(),
  bon_address: z.string(),
});

export type BonSettings = z.infer<typeof BonSettingsSchema>;

export const BonSettingsForm: React.FC<FormikProps<BonSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField label={t("settings.bon.title")} name="bon_title" formik={formik} />
      <FormTextField label={t("settings.bon.issuer")} name="bon_issuer" formik={formik} />
      <FormTextField label={t("settings.bon.address")} name="bon_address" formik={formik} multiline={true} />
    </>
  );
};

const BonPreviewPopup: React.FC<{ bon: BonJsonRead | null; nodeId: number; closePreview: () => void }> = ({
  bon,
  nodeId,
  closePreview,
}) => {
  const { t } = useTranslation();
  const { data: eventDesign } = useGetEventDesignQuery({ nodeId });
  return (
    <Dialog open={bon != null} onClose={closePreview} maxWidth="lg" fullWidth={true}>
      <DialogTitle>{t("settings.bon.previewBon")}</DialogTitle>
      <DialogContent>
        {bon && <BonDisplay bon={bon} bonLogoUrl={getBlobUrl(eventDesign?.bon_logo_blob_id)} />}
      </DialogContent>
    </Dialog>
  );
};

export const TabBon: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();
  const [previewBon, { isLoading: bonPreviewGenerating }] = useGenerateTestBonMutation();
  const [bonPreview, setBonPreview] = React.useState<BonJsonRead | null>(null);
  const [previewReport, { isLoading: reportPreviewGenerating }] = useGenerateTestRevenueReportMutation();

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

  const openBonPreview = async () => {
    try {
      console.log("starting bon preview");
      const resp = await previewBon({
        nodeId,
      });
      if (resp.data) {
        setBonPreview(resp.data);
      } else {
        toast.error("Error generating bon preview");
      }
    } catch {
      toast.error("Error generating bon preview");
    }
  };

  const closeBonPreview = () => {
    setBonPreview(null);
  };

  const openReportPreview = async () => {
    try {
      console.log("starting report preview");
      const resp = await previewReport({
        nodeId,
      });
      const pdfUrl = (resp as any).data;
      if (pdfUrl === undefined) {
        console.log(resp);
        toast.error("Error generating report preview");
      } else {
        window.open(pdfUrl);
      }
    } catch (e) {
      toast.error("Error generating report preview");
    }
  };

  return (
    <Stack spacing={2}>
      <Formik
        initialValues={eventSettings as BonSettings} // TODO: figure out a way of not needing to cast this
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(BonSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <BonSettingsForm {...formik} />
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
      <LoadingButton
        variant="contained"
        onClick={openBonPreview}
        loading={bonPreviewGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("settings.bon.previewBon")}
      </LoadingButton>
      <LoadingButton
        variant="contained"
        onClick={openReportPreview}
        loading={reportPreviewGenerating}
        startIcon={<ReceiptIcon />}
        loadingPosition="start"
      >
        {t("settings.bon.previewReport")}
      </LoadingButton>
      <BonPreviewPopup bon={bonPreview} nodeId={nodeId} closePreview={closeBonPreview} />
    </Stack>
  );
};
