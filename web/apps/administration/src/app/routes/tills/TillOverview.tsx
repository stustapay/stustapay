import { Checkbox, FormControlLabel, Link, Paper } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { getUserName } from "@stustapay/models";
import { ArrayElement, StringyBoolean, useQueryState } from "@stustapay/utils";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";

import { CashRegistersRoutes, TerminalRoutes, TillRoutes, UserRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import {
  getCashRegisterCollection,
  getTerminalCollection,
  getTillCollection,
  getUserCollection,
} from "@/db/collections";
import { useCurrentNode, useRenderNode } from "@/hooks";

const FilterOptionsSchema = z.object({
  showZeroBalance: StringyBoolean,
  showUnassigned: StringyBoolean,
});

export const TillOverview: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [filterOptions, setFilterOptions] = useQueryState<{
    showZeroBalance: boolean;
    showUnassigned: boolean;
  }>({ showZeroBalance: true, showUnassigned: true }, FilterOptionsSchema);

  const { data: registers, isLoading: isRegistersLoading } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(currentNode.id) })
        .join(
          { tills: getTillCollection(currentNode.id) },
          ({ registers, tills }) => eq(registers.current_till_id, tills.id),
          "left" as const,
        )
        .join(
          { terminals: getTerminalCollection(currentNode.id) },
          ({ tills, terminals }) => eq(tills.terminal_id, terminals.id),
          "left" as const,
        )
        .join(
          { users: getUserCollection(currentNode.id) },
          ({ registers, users }) => eq(registers.current_cashier_id, users.id),
          "left" as const,
        )
        .select(({ registers, tills, terminals, users }) => ({
          ...registers,
          till: tills,
          terminal: terminals,
          cashier: users,
        })),
    [currentNode.id],
  );
  const { dataGridNodeColumn } = useRenderNode();

  type RegisterRow = ArrayElement<NonNullable<typeof registers>>;

  const rows = React.useMemo((): RegisterRow[] | undefined => {
    if (!registers) {
      return undefined;
    }

    return registers.filter((register) => {
      if (!filterOptions.showUnassigned && register.current_cashier_id == null) {
        return false;
      }
      if (!filterOptions.showZeroBalance && register.balance === 0) {
        return false;
      }
      return true;
    });
  }, [registers, filterOptions]);

  const columns: GridColDef<RegisterRow>[] = [
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
      renderCell: (params) => {
        const cashier = params.row.cashier;
        if (cashier?.id == null || cashier.login == null) {
          return null;
        }

        return (
          <Link
            component={RouterLink}
            to={UserRoutes.detail(cashier.id, cashier.node_id ?? params.row.node_id)}
          >
            {getUserName({ login: cashier.login, display_name: cashier.display_name ?? "" })}
          </Link>
        );
      },
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
      field: "terminal_id",
      headerName: t("till.terminal"),
      width: 200,
      renderCell: (params) =>
        params.row.terminal ? (
          <Link
            component={RouterLink}
            to={TerminalRoutes.detail(params.row.terminal.id, params.row.terminal.node_id)}
          >
            {params.row.terminal.name}
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
              navigate(
                UserRoutes.detailAction(
                  params.row.current_cashier_id,
                  "close-out",
                  params.row.node_id,
                ),
              )
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
              onChange={(evt) =>
                setFilterOptions({ ...filterOptions, showZeroBalance: evt.target.checked })
              }
            />
          }
          label={t("cashier.showZeroBalance")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={filterOptions.showUnassigned}
              onChange={(evt) =>
                setFilterOptions({ ...filterOptions, showUnassigned: evt.target.checked })
              }
            />
          }
          label={t("till.showUnassignedRegisters")}
        />
      </Paper>
      <DataGrid
        autoHeight
        loading={isRegistersLoading}
        rows={rows ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
