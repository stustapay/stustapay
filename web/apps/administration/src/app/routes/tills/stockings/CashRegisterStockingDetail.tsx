import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { TillStockingsRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { getCashRegisterStockingCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { StockingMakeupTable } from "./StockingMakeupTable";

export const CashRegisterStockingDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { stockingId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const {
    data: stocking,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ stockings: getCashRegisterStockingCollection(currentNode.id) })
        .where(({ stockings }) => eq(stockings.id, Number(stockingId)))
        .findOne(),
    [currentNode.id, stockingId]
  );

  if (isError) {
    return <Navigate to={TillStockingsRoutes.list()} />;
  }

  if (isLoading || !stocking) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("register.deleteStocking"),
      content: t("register.deleteStockingDescription"),
      onConfirm: () => {
        getCashRegisterStockingCollection(currentNode.id)
          .delete(Number(stockingId))
          .isPersisted.promise.then(() => navigate(TillStockingsRoutes.list()));
      },
    });
  };

  return (
    <DetailLayout
      title={stocking.name}
      routes={TillStockingsRoutes}
      elementNodeId={stocking.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TillStockingsRoutes.edit(stocking.id)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <Stack spacing={2}>
        <DetailView>
          <DetailField label={t("register.name")} value={stocking.name} />
          <DetailNumberField label={t("register.stockingTotal")} value={stocking.total} type="currency" />
        </DetailView>
        <StockingMakeupTable stocking={stocking} />
      </Stack>
    </DetailLayout>
  );
};
