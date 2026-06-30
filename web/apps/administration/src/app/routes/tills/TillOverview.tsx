import { Checkbox, FormControlLabel, Link, Paper } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import { StringyBoolean, useQueryState } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";

import {
  CashRegister,
  selectUserById,
  selectCashRegisterAll,
  selectTillById,
  useListUsersQuery,
  useListCashRegistersAdminQuery,
  useListTillsQuery,
} from "@/api";
import { CashRegistersRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useRenderNode } from "@/hooks";

const FilterOptionsSchema = z.object({
  showZeroBalance: StringyBoolean,
  showUnassigned: StringyBoolean,
});

export const TillOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [filterOptions, setFilterOptions] = useQueryState<{ showZeroBalance: boolean; showUnassigned: boolean }>(
    { showZeroBalance: true, showUnassigned: true },
    FilterOptionsSchema
  );

  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: users, isLoading: isUsersLoading } = useListUsersQuery({ nodeId: currentNode.id });
  const { registers, isLoading: isRegistersLoading } = useListCashRegistersAdminQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        registers: data
          ? selectCashRegisterAll(data).filter((register) => {
              if (!filterOptions.showUnassigned && register.current_cashier_id == null) {
                return false;
              }
              if (!filterOptions.showZeroBalance && register.balance === 0) {
                return false;
              }
              return true;
            })
          : undefined,
      }),
    }
  );
  const { dataGridNodeColumn } = useRenderNode();

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillRoutes.detail(till.id, till.node_id)}>
        {till.name}
      </Link>
    );
  };

  const renderCashier = (id: number | null) => {
    if (id == null || !users) {
      return "";
    }
    const cashier = selectUserById(users, id);
    if (!cashier) {
      return "";
    }

    return (
      <Link component={RouterLink} to={UserRoutes.detail(cashier.id, cashier.node_id)}>
        {getUserName(cashier)}
      </Link>
    );
  };

  const columns: GridColDef<CashRegister>[] = [
    {
      field: "name",
      headerName: t("register.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={CashRegistersRoutes.detail(params.row.id, params.row.node_id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "current_cashier_id",
      headerName: t("register.currentCashier"),
      width: 200,
      renderCell: (params) => renderCashier(params.row.current_cashier_id),
    },
    {
      field: "current_till_id",
      headerName: t("register.currentTill"),
      width: 200,
      renderCell: (params) => renderTill(params.row.current_till_id),
    },
    {
      field: "balance",
      headerName: t("register.currentBalance"),
      type: "currency",
      width: 200,
    },
    dataGridNodeColumn,
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 120,
      getActions: (params) => {
        if (params.row.current_cashier_id == null || params.row.balance === 0) {
          return [];
        }
        return [
          <GridActionsCellItem
            key="close-out"
            label={t("cashier.closeOut")}
            onClick={() =>
              navigate(UserRoutes.detailAction(params.row.current_cashier_id, "close-out", params.row.node_id))
            }
            showInMenu
          />,
        ];
      },
    },
  ];

  return (
    <ListLayout title={t("till.overview")}>
      <Paper sx={{ p: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={filterOptions.showZeroBalance}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showZeroBalance: evt.target.checked })}
            />
          }
          label={t("cashier.showZeroBalance")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={filterOptions.showUnassigned}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showUnassigned: evt.target.checked })}
            />
          }
          label={t("till.showUnassignedRegisters")}
        />
      </Paper>
      <DataGrid
        autoHeight
        loading={isRegistersLoading || isTillsLoading || isUsersLoading}
        rows={registers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
