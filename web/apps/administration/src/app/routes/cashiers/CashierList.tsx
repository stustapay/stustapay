import { CashierRead, selectCashierAll, selectTillById, useListCashiersQuery, useListTillsQuery } from "@/api";
import { CashierRoutes, TillRoutes, UserTagRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode, useRenderNode } from "@/hooks";
import { Checkbox, FormControlLabel, Link, Paper } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import { StringyBoolean, useQueryState } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";

const FilterOptionsSchema = z.object({
  showZeroBalance: StringyBoolean,
  showWithoutTill: StringyBoolean,
});

export const CashierList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const [filterOptions, setFilterOptions] = useQueryState(
    { showZeroBalance: true, showWithoutTill: true },
    FilterOptionsSchema
  );

  const { cashiers, isLoading: isCashiersLoading } = useListCashiersQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        cashiers: data
          ? selectCashierAll(data).filter((cashier) => {
              if (!filterOptions.showWithoutTill && cashier.till_ids.length === 0) {
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
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });
  const renderNode = useRenderNode();

  if (isCashiersLoading || isTillsLoading) {
    return <Loading />;
  }

  const renderTill = (id?: number | null) => {
    if (!id || !tills) {
      return "";
    }

    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} key={id} to={TillRoutes.detail(till.id)}>
        {till.name}
      </Link>
    );
  };

  const columns: GridColDef<CashierRead>[] = [
    {
      field: "login",
      headerName: t("cashier.login") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={CashierRoutes.detail(params.row.id)}>
          {params.row.login}
        </Link>
      ),
      flex: 1,
    },
    {
      field: "display_name",
      headerName: t("cashier.name") as string,
      flex: 1,
    },
    {
      field: "description",
      headerName: t("cashier.description") as string,
      type: "string",
      flex: 2,
    },
    {
      field: "till_id",
      headerName: t("cashier.till") as string,
      flex: 0.5,
      minWidth: 150,
      renderCell: (params) => params.row.till_ids.map((till_id) => renderTill(till_id)),
    },
    {
      field: "user_tag_id",
      headerName: t("cashier.tagId") as string,
      type: "number",
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      width: 150,
    },
    {
      field: "cash_drawer_balance",
      headerName: t("cashier.cashDrawerBalance") as string,
      type: "currency",
      width: 150,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
      flex: 1,
    },
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
              checked={filterOptions.showWithoutTill}
              onChange={(evt) => setFilterOptions({ ...filterOptions, showWithoutTill: evt.target.checked })}
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
