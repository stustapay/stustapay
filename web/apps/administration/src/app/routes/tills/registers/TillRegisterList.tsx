import {
  selectCashierById,
  selectTillById,
  selectTillRegisterAll,
  useDeleteRegisterMutation,
  useListCashRegistersAdminQuery,
  useListCashiersQuery,
  useListTillsQuery,
} from "@/api";
import { CashierRoutes, TillRegistersRoutes, TillRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrencyFormatter, useCurrentNode, useCurrentUserHasPrivilege } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { TillRegister, getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TillRegisterList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageNode = useCurrentUserHasPrivilege(TillRegistersRoutes.privilege);
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: cashiers } = useListCashiersQuery({ nodeId: currentNode.id });
  const { stockings: registers, isLoading } = useListCashRegistersAdminQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        stockings: data ? selectTillRegisterAll(data) : undefined,
      }),
    }
  );
  const [deleteRegister] = useDeleteRegisterMutation();

  const [registerToDelete, setToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && registerToDelete !== null) {
      deleteRegister({ nodeId: currentNode.id, registerId: registerToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setToDelete(null);
  };

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillRoutes.detail(till.id)}>
        {till.name}
      </Link>
    );
  };

  const renderCashier = (id: number | null) => {
    if (id == null || !cashiers) {
      return "";
    }
    const cashier = selectCashierById(cashiers, id);
    if (!cashier) {
      return "";
    }

    return (
      <Link component={RouterLink} to={CashierRoutes.detail(cashier.id)}>
        {getUserName(cashier)}
      </Link>
    );
  };

  const columns: GridColDef<TillRegister>[] = [
    {
      field: "name",
      headerName: t("register.name") as string,
      flex: 1,
    },
    {
      field: "current_cashier_id",
      headerName: t("register.currentCashier") as string,
      width: 200,
      renderCell: (params) => renderCashier(params.row.current_cashier_id),
    },
    {
      field: "current_till_id",
      headerName: t("register.currentTill") as string,
      width: 200,
      renderCell: (params) => renderTill(params.row.current_till_id),
    },
    {
      field: "current_balance",
      headerName: t("register.currentBalance") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 200,
    },
  ];

  if (canManageNode) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<SwapHorizIcon />}
          color="primary"
          label={t("register.transfer")}
          disabled={params.row.current_cashier_id == null}
          onClick={() => navigate(`${TillRegistersRoutes.detail(params.row.id)}/transfer`)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TillRegistersRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    });
  }

  return (
    <ListLayout title={t("register.registers")} routes={TillRegistersRoutes}>
      <DataGrid
        autoHeight
        rows={registers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteRegister")}
        body={t("register.deleteRegisterDescription")}
        show={registerToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </ListLayout>
  );
};
