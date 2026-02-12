import { usePayoutRunSepaXmlMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Download as DownloadIcon } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik } from "formik";
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

const FormSchema = z.object({});

type FormValues = { execution_date: DateTime };

const initialValues: FormValues = {
  execution_date: DateTime.now(),
};

export const DownloadSepaXMLModal: React.FC<DownloadSepaXMLModalProps> = ({ payoutRunId, show, onClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [sepaExport] = usePayoutRunSepaXmlMutation();

  const handleSubmit = async (values: FormValues) => {
    const isoDate = values.execution_date.toISODate();
    if (!isoDate) {
      // TODO proper validation
      return;
    }

    try {
      const data = await sepaExport({
        payoutRunId: payoutRunId,
        nodeId: currentNode.id,
        createSepaXmlPayload: { execution_date: isoDate },
      }).unwrap();
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/xml" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `sepa__run_${payoutRunId}__${values.execution_date}.xml`);
      link.click();
      link.remove();
      onClose();
    } catch {
      toast.error("Error downloading sepa xml");
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
        {(formik) => (
          <Form>
            <DialogContent>
              <Stack spacing={2}>
                <Alert severity="warning">{t("payoutRun.createNewSepaXmlInfo")}</Alert>
                <DatePicker
                  label={t("payoutRun.executionDate")}
                  value={formik.values.execution_date}
                  sx={{ width: "100%" }}
                  onChange={(value) => formik.setFieldValue("execution_date", value)}
                />
              </Stack>
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
