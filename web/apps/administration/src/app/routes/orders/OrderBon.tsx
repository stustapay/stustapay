import { useGetEventDesignQuery, useGetOrderBonQuery } from "@/api";
import { getBlobUrl } from "@/core/blobs";
import { useCurrentNode } from "@/hooks";
import { Alert, Paper } from "@mui/material";
import { BonDisplay, Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export const OrderBon: React.FC = () => {
  const { orderId } = useParams();
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: eventDesign } = useGetEventDesignQuery({ nodeId: currentNode.event_node_id ?? currentNode.id });

  const { data: bon, isError } = useGetOrderBonQuery({ orderId: Number(orderId) });

  if (!isError && !bon) {
    return <Loading />;
  }

  if (!bon) {
    return <Alert severity="error">{t("errorLoadingBon")}</Alert>;
  }

  return (
    <Paper>
      <BonDisplay bon={bon} bonLogoUrl={getBlobUrl(eventDesign?.bon_logo_blob_id)} />
    </Paper>
  );
};
