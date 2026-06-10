import { Checkbox, FormControlLabel, Link, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { formatUserTagUid } from "@stustapay/models";
import { StringyBoolean, useQueryState } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";

import { CashierRead, selectCashierAll, selectTerminalById, useListCashiersQuery, useListTerminalsQuery } from "@/api";
import { CashierRoutes, TerminalRoutes, UserTagRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useRenderNode } from "@/hooks";

const FilterOptionsSchema = z.object({
  showZeroBalance: StringyBoolean,
  showWithoutTerminal: StringyBoolean,
});

export const CashierList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const [filterOptions, setFilterOptions] = useQueryState<{ showZeroBalance: boolean; showWithoutTerminal: boolean }>(
    { showZeroBalance: true, showWithoutTerminal: true },
    FilterOptionsSchema
  );

  const { cashiers, isLoading: isCashiersLoading } = useListCashiersQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashiers: data
          ? selectCashierAll(data).filter((cashier) => {
              if (!filterOptions.showWithoutTerminal && cashier.terminal_ids.length === 0) {
                return false;
              }
              if (!filterOptions.showZeroBalance && cashier.cash_drawer_balance === 0) {
                return false;
              }
              return true;
            })
          : undefined,
      }),
    }
  );
  const { data: terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery({ nodeId: currentNode.id });
  const { dataGridNodeColumn } = useRenderNode();

  if (isCashiersLoading || isTerminalsLoading) {
    return <Loading />;
  }

  const renderTerminals = (ids?: number[] | null) => {
    if (!ids || !terminals) {
      return "";
    }
    const actualTerminals = ids
      .map((id) => selectTerminalById(terminals, id))
      .filter((t): t is NonNullable<typeof t> => t != null);
    actualTerminals.sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div>
        {actualTerminals.map((terminal, index) => {
          return (
            <React.Fragment key={terminal.id}>
              {index > 0 ? ", " : null}
              <Link component={RouterLink} to={TerminalRoutes.detail(terminal.id)}>
                {terminal.name}
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const columns: GridColDef<CashierRead>[] = [
    {
      field: "login",
      headerName: t("cashier.login"),
      renderCell: (params) => (
        <Link component={RouterLink} to={CashierRoutes.detail(params.row.id)}>
          {params.row.login}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "display_name",
      headerName: t("cashier.name"),
      flex: 1,
    },
    {
      field: "description",
      headerName: t("cashier.description"),
      type: "string",
      flex: 2,
    },
    {
      field: "terminal_ids",
      headerName: t("cashier.terminals"),
      flex: 0.5,
      minWidth: 150,
      renderCell: (params) => renderTerminals(params.row.terminal_ids),
    },
    {
      field: "user_tag_id",
      headerName: t("cashier.tagId"),
      type: "number",
      valueGetter: (_, row) => formatUserTagUid(row.user_tag_uid_hex),
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      width: 150,
    },
    {
      field: "cash_drawer_balance",
      headerName: t("cashier.cashDrawerBalance"),
      type: "currency",
      width: 150,
    },
    dataGridNodeColumn,
  ];

  return (
    <ListLayout title={t("cashiers")}>
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
              checked={filterOptions.showWithoutTerminal}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showWithoutTerminal: evt.target.checked })}
            />
          }
          label={t("cashier.showWithoutTill")}
        />
      </Paper>
      <DataGrid
        autoHeight
        rows={cashiers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
