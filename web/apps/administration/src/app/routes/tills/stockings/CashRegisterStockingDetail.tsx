import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  selectCashRegisterStockingById,
  useDeleteRegisterStockingMutation,
  useListRegisterStockingsQuery,
} from "@/api";
import { TillStockingsRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";

import { StockingMakeupTable } from "./StockingMakeupTable";

export const CashRegisterStockingDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { stockingId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const [deleteStocking] = useDeleteRegisterStockingMutation();
  const { stocking, isLoading, error } = useListRegisterStockingsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        stocking: data ? selectCashRegisterStockingById(data, Number(stockingId)) : undefined,
      }),
    }
  );

  if (error) {
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
        deleteStocking({ nodeId: currentNode.id, stockingId: stocking.id })
          .unwrap()
          .then(() => navigate(TillStockingsRoutes.list()))
          .catch(() => undefined);
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
