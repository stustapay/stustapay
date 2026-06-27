import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { useExportAo146AMutation, useExportDsfinvkMutation } from "@/api";
import { ListLayout } from "@/components/layouts";
import { useCurrentNode } from "@/hooks";

function downloadBlob(blobUrl: string, filename: string) {
  const link = document.createElement("a");
  link.setAttribute("href", blobUrl);
  link.setAttribute("download", filename);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export const DsfinvkExport: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [shutdownDate, setShutdownDate] = React.useState<string | null>(null);
  const [exportDsfinvk, { isLoading: dsfinvkExporting }] = useExportDsfinvkMutation();
  const [exportAo146A, { isLoading: ao146aExporting }] = useExportAo146AMutation();

  const handleDsfinvkExport = async () => {
    try {
      const blobUrl = await exportDsfinvk({ nodeId: currentNode.id }).unwrap();
      downloadBlob(blobUrl, "dsfinV_k.zip");
    } catch {
      toast.error(t("dsfinvkExport.exportDsfinvkError"));
    }
  };

  const handleAo146aExport = async () => {
    try {
      const blobUrl = await exportAo146A({
        nodeId: currentNode.id,
        ao146AExportPayload: {
          shutdown_date: shutdownDate,
        },
      }).unwrap();
      downloadBlob(blobUrl, "ao146a.xml");
    } catch {
      toast.error(t("dsfinvkExport.exportAo146aError"));
    }
  };

  return (
    <ListLayout title={t("dsfinvkExport.title")}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{t("dsfinvkExport.dsfinvkTitle")}</Typography>
            <Typography color="text.secondary">{t("dsfinvkExport.dsfinvkDescription")}</Typography>
            <Box>
              <LoadingButton
                variant="contained"
                onClick={handleDsfinvkExport}
                loading={dsfinvkExporting}
                startIcon={<FileDownloadIcon />}
                loadingPosition="start"
              >
                {t("dsfinvkExport.downloadDsfinvk")}
              </LoadingButton>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{t("dsfinvkExport.ao146aTitle")}</Typography>
            <Typography color="text.secondary">{t("dsfinvkExport.ao146aDescription")}</Typography>
            <DatePicker
              label={t("dsfinvkExport.shutdownDate")}
              value={shutdownDate ? DateTime.fromISO(shutdownDate) : null}
              onChange={(value) => setShutdownDate(value?.toISODate() ?? null)}
              slotProps={{
                textField: {
                  helperText: t("dsfinvkExport.shutdownDateHelp"),
                  variant: "standard",
                },
              }}
            />
            <Box>
              <LoadingButton
                variant="contained"
                onClick={handleAo146aExport}
                loading={ao146aExporting}
                startIcon={<FileDownloadIcon />}
                loadingPosition="start"
              >
                {t("dsfinvkExport.downloadAo146a")}
              </LoadingButton>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </ListLayout>
  );
};
