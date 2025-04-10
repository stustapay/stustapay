import { RestrictedEventSettings, useGetEventDesignQuery, useUpdateBonLogoMutation } from "@/api";
import { getBlobUrl } from "@/core/blobs";
import { useCurrentNode } from "@/hooks";
import { Button, Card, Grid, Stack, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const TabDesign: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: eventDesign } = useGetEventDesignQuery({ nodeId: currentNode.id });
  const [updateBonLogo] = useUpdateBonLogoMutation();

  const selectFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.type !== "image/svg+xml") {
      toast.error("Only SVG images are allowed");
      return;
    }
    try {
      const imageAsBase64 = await toBase64(file);
      await updateBonLogo({
        nodeId: currentNode.id,
        newBlob: { data: imageAsBase64.split(",")[1], mime_type: file.type }, // TODO: remove the ugly hack
      });
    } catch (e) {
      toast.error("Error uploading logo");
    }
  };

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2 }}>
        <Typography>{t("settings.design.bonLogo")}</Typography>
        {eventDesign?.bon_logo_blob_id && (
          <Grid>
            <img width="100%" src={getBlobUrl(eventDesign?.bon_logo_blob_id)} alt="" />
          </Grid>
        )}
        <label htmlFor="btn-upload">
          <input
            id="btn-upload"
            name="btn-upload"
            style={{ display: "none" }}
            type="file"
            accept="image/svg+xml"
            onChange={selectFile}
          />
          <Button component="span">{t("settings.design.changeBonLogo")}</Button>
        </label>
      </Card>
    </Stack>
  );
};
