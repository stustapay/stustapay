import { AccountRead } from "@/api";
import { AccountRoutes, UserTagRoutes } from "@/app/routes";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DataGridTitle } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import { ArrayElement } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

type History = AccountRead["tag_history"];
type HistoryEntry = ArrayElement<History>;

export interface AccountTagHistoryTableProps {
  history: History;
}

export const AccountTagHistoryTable: React.FC<AccountTagHistoryTableProps> = ({ history }) => {
  const { t } = useTranslation();

  const columns: GridColDef<HistoryEntry>[] = [
    {
      field: "user_tag_id",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.user_tag_id)}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      width: 100,
    },
    {
      field: "account_id",
      headerName: t("account.history.account") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={AccountRoutes.detail(params.row.account_id)}>
          {params.row.account_id}
        </Link>
      ),
      width: 100,
    },
    {
      field: "comment",
      headerName: t("account.history.comment") as string,
      flex: 1,
    },
    {
      field: "mapping_was_valid_until",
      headerName: t("account.history.validUntil") as string,
      type: "dateTime",
      valueGetter: (value) => new Date(value),
      width: 200,
    },
  ];

  return (
    <DataGrid
      autoHeight
      slots={{ toolbar: () => <DataGridTitle title={t("account.history.title")} /> }}
      getRowId={(row) => `${row.account_id}-${row.user_tag_id}`}
      rows={history}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
