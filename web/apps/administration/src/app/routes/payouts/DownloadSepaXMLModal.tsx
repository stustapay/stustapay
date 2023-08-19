import { usePayoutRunSepaXmlExportMutation } from "@api";
import { Download as DownloadIcon } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { NumericInput } from "@stustapay/components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

export interface DownloadSepaXMLModalProps {
  payoutRunId: number;
  show: boolean;
  onClose: () => void;
}

const FormSchema = z.object({
  batch_size: z.number().int().optional(),
});

type FormValues = z.infer<typeof FormSchema> & { execution_date: DateTime };

const initialValues: FormValues = {
  batch_size: undefined,
  execution_date: DateTime.now(),
};

export const DownloadSepaXMLModal: React.FC<DownloadSepaXMLModalProps> = ({ payoutRunId, show, onClose }) => {
  const { t } = useTranslation();
  const [sepaExport] = usePayoutRunSepaXmlExportMutation();

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    const isoDate = values.execution_date.toISODate();
    if (!isoDate) {
      // TODO proper validation
      return;
    }

    try {
      console.log("exporting sepa");
      const data = await sepaExport({
        payoutRunId: payoutRunId,
        createSepaXmlPayload: { execution_date: isoDate, batch_size: values.batch_size },
      }).unwrap();
      data.forEach((batch, index) => {
        const url = window.URL.createObjectURL(new Blob([batch], { type: "text/xml" }));
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sepa__run_${payoutRunId}__num_${index}__${values.execution_date}.xml`);
        link.click();
        link.remove();
      });
    } catch {
      toast.error("Error downloading csv");
    }
  };

  return (
    <Dialog open={show}>
      <DialogTitle>{t("payoutRun.downloadSepaModalTitle")}</DialogTitle>
      <Formik
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(FormSchema)}
        initialValues={initialValues}
      >
        {({ values, setFieldValue, handleSubmit, touched, errors }) => (
          <Form>
            <DialogContent>
              <DatePicker
                label={t("payoutRun.executionDate")}
                value={values.execution_date}
                sx={{ width: "100%" }}
                onChange={(value) => setFieldValue("execution_date", value)}
              />
              <NumericInput
                variant="outlined"
                margin="normal"
                fullWidth
                name="batch_size"
                label={t("payoutRun.batchSize")}
                error={touched.batch_size && !!errors.batch_size}
                helperText={(touched.batch_size && errors.batch_size) as string}
                onChange={(value) => setFieldValue("batch_size", value)}
                value={values.batch_size}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} color="error">
                {t("cancel")}
              </Button>
              <Button type="submit" color="primary" startIcon={<DownloadIcon />}>
                {t("download")}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};
