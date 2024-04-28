import {
  CashRegisterStocking,
  selectTillRegisterStockingAll,
  useDeleteRegisterStockingMutation,
  useListRegisterStockingsQuery,
} from "@/api";
import { TillStockingsRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import {
  useCurrencyFormatter,
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
} from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const TillRegisterStockingList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();
  const canManageStockings = useCurrentUserHasPrivilege(TillStockingsRoutes.privilege);
  const canManageStockingsAtNode = useCurrentUserHasPrivilegeAtNode(TillStockingsRoutes.privilege);
  const formatCurrency = useCurrencyFormatter();

  const { stockings, isLoading } = useListRegisterStockingsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        stockings: data ? selectTillRegisterStockingAll(data) : undefined,
      }),
    }
  );
  const [deleteStocking] = useDeleteRegisterStockingMutation();

  const [stockingToDelete, setStockingToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setStockingToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && stockingToDelete !== null) {
      deleteStocking({ nodeId: currentNode.id, stockingId: stockingToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setStockingToDelete(null);
  };

  const columns: GridColDef<CashRegisterStocking>[] = [
    {
      field: "name",
      headerName: t("register.name") as string,
      flex: 1,
    },
    {
      field: "total",
      headerName: t("register.stockingTotal") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
    },
  ];

  if (canManageStockings) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) =>
        canManageStockingsAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TillStockingsRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                color="error"
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("register.stockings")} routes={TillStockingsRoutes}>
      <DataGrid
        autoHeight
        rows={stockings ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteStocking")}
        body={t("register.deleteStockingDescription")}
        show={stockingToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </ListLayout>
  );
};
