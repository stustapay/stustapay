import * as React from "react";
import { Account, formatUserTagUid } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ArrayElement, formatDate } from "@stustapay/utils";
import { DataGridTitle } from "@stustapay/components";
import { Link } from "@mui/material";

type History = Account["tag_history"];
type HistoryEntry = ArrayElement<History>;

export interface AccountTagHistoryTableProps {
  history: History;
}

export const AccountTagHistoryTable: React.FC<AccountTagHistoryTableProps> = ({ history }) => {
  const { t } = useTranslation();

  const columns: GridColDef<HistoryEntry>[] = [
    {
      field: "user_tag_uid_hex",
      headerName: t("account.user_tag_uid") as string,
      align: "right",
      renderCell: (params) => (
        <Link component={RouterLink} to={`/user-tags/${params.row.user_tag_uid_hex}`}>
          {formatUserTagUid(params.row.user_tag_uid_hex)}
        </Link>
      ),
      width: 100,
    },
    {
      field: "account_id",
      headerName: t("account.history.account") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={`/customer-accounts/${params.row.account_id}`}>
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
      type: "number",
      valueGetter: ({ value }) => formatDate(value),
      width: 200,
    },
  ];

  return (
    <DataGrid
      autoHeight
      slots={{ toolbar: () => <DataGridTitle title={t("account.history.title")} /> }}
      getRowId={(row) => row.user_tag_uid_hex}
      rows={history}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
