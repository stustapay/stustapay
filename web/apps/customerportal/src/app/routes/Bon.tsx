import { useGetBonQuery } from "@/api";
import { config } from "@/api/common";
import { usePublicConfig } from "@/hooks";
import { Alert } from "@mui/material";
import { BonDisplay, Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const getBlobUrl = (blobId?: string | null) => {
  if (!blobId) {
    return undefined;
  }
  return `${config.customerApiBaseUrl}/blob/${blobId}`;
};

export const Bon: React.FC = () => {
  const { orderUUID } = useParams();
  const { t } = useTranslation();
  const publicConfig = usePublicConfig();

  const { data: bon, isError } = useGetBonQuery({ orderUuid: orderUUID! });

  if (!isError && !bon) {
    return <Loading />;
  }

  if (!bon) {
    return <Alert severity="error">{t("errorLoadingBon")}</Alert>;
  }

  return <BonDisplay bon={bon} bonLogoUrl={getBlobUrl(publicConfig.event_design.bon_logo_blob_id)} />;
};
