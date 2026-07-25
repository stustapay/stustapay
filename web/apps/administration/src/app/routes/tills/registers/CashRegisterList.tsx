import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import { ArrayElement } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { CashRegistersRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { getCashRegisterCollection, getTillCollection, getUserCollection } from "@/db/collections";
import {
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";

export const CashRegisterList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageRegisters = useCurrentUserHasPrivilege(CashRegistersRoutes.privilege);
  const canManageRegistersAtNode = useCurrentUserHasPrivilegeAtNode(CashRegistersRoutes.privilege);
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const { dataGridNodeColumn } = useRenderNode();

  const { data: registers, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(currentNode.id) })
        .join(
          { tills: getTillCollection(currentNode.id) },
          ({ registers, tills }) => eq(registers.current_till_id, tills.id),
          "left" as const,
        )
        .join(
          { users: getUserCollection(currentNode.id) },
          ({ registers, users }) => eq(registers.current_cashier_id, users.id),
          "left" as const,
        )
        .select(({ registers, tills, users }) => ({
          ...registers,
          till: tills,
          cashier: users,
        })),
    [currentNode.id],
  );

  const openConfirmDeleteDialog = (registerId: number) => {
    openModal({
      type: "confirm",
      title: t("register.deleteRegister"),
      content: t("register.deleteRegisterDescription"),
      onConfirm: () => {
        getCashRegisterCollection(currentNode.id).delete(registerId);
      },
    });
  };

  const renderCashier = (cashier: ArrayElement<NonNullable<typeof registers>>["cashier"]) => {
    if (cashier?.id == null || cashier.login == null) {
      return null;
    }

    return (
      <Link
        component={RouterLink}
        to={UserRoutes.detail(cashier.id, cashier.node_id ?? currentNode.id)}
      >
        {getUserName({ login: cashier.login, display_name: cashier.display_name ?? "" })}
      </Link>
    );
  };

  const columns: GridColDef<ArrayElement<NonNullable<typeof registers>>>[] = [
    {
      field: "name",
      headerName: t("register.name"),
      flex: 1,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={CashRegistersRoutes.detail(params.row.id, params.row.node_id)}
        >
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "current_cashier_id",
      headerName: t("register.currentCashier"),
      width: 200,
      renderCell: (params) => renderCashier(params.row.cashier),
    },
    {
      field: "current_till_id",
      headerName: t("register.currentTill"),
      width: 200,
      renderCell: (params) =>
        params.row.till ? (
          <Link
            component={RouterLink}
            to={TillRoutes.detail(params.row.till.id, params.row.till.node_id)}
          >
            {params.row.till.name}
          </Link>
        ) : null,
    },
    {
      field: "balance",
      headerName: t("register.currentBalance"),
      type: "currency",
      width: 200,
    },
    dataGridNodeColumn,
  ];

  if (canManageRegisters) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageRegistersAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<SwapHorizIcon />}
                color="primary"
                label={t("register.transfer")}
                disabled={params.row.current_cashier_id == null}
                onClick={() => navigate(`${CashRegistersRoutes.detail(params.row.id)}/transfer`)}
              />,
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(CashRegistersRoutes.edit(params.row.id))}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon color="error" />}
                label={t("delete")}
                onClick={() => openConfirmDeleteDialog(params.row.id)}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("register.registers")} routes={CashRegistersRoutes}>
      <DataGrid
        autoHeight
        loading={isLoading}
        rows={registers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
