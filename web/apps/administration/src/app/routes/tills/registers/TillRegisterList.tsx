import {
  selectCashierById,
  selectTillById,
  selectTillRegisterAll,
  useDeleteRegisterMutation,
  useListCashRegistersAdminQuery,
  useListCashiersQuery,
  useListTillsQuery,
  CashRegister,
} from "@/api";
import { CashierRoutes, TillRegistersRoutes, TillRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import {
  useCurrencyFormatter,
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TillRegisterList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageRegisters = useCurrentUserHasPrivilege(TillRegistersRoutes.privilege);
  const canManageRegistersAtNode = useCurrentUserHasPrivilegeAtNode(TillRegistersRoutes.privilege);
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const openModal = useOpenModal();
  const renderNode = useRenderNode();

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

  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (registerId: number) => {
    openModal({
      type: "confirm",
      title: t("register.deleteRegister"),
      content: t("register.deleteRegisterDescription"),
      onConfirm: () => {
        deleteRegister({ nodeId: currentNode.id, registerId })
          .unwrap()
          .catch(() => undefined);
      },
    });
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
      <Link component={RouterLink} to={CashierRoutes.detail(cashier.id, cashier.node_id)}>
        {getUserName(cashier)}
      </Link>
    );
  };

  const columns: GridColDef<CashRegister>[] = [
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
      valueFormatter: (value) => formatCurrency(value),
      width: 200,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
      flex: 1,
    },
  ];

  if (canManageRegisters) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) =>
        canManageRegistersAtNode(params.row.node_id)
          ? [
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
            ]
          : [],
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
    </ListLayout>
  );
};
