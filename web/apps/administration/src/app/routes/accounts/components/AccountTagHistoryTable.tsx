import { Link } from "@mui/material";
import { DataGrid, DataGridTitle, GridColDef } from "@stustapay/framework";
import { ArrayElement } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { AccountRead } from "@/api";
import { CustomerRoutes } from "@/app/routes";
import { UserTagCell, userTagValueGetter } from "@/components/table/UserTagCell";

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
      valueGetter: (_, row) => userTagValueGetter(row),
      renderCell: ({ row }) => <UserTagCell userTag={row} />,
      width: 100,
    },
    {
      field: "account_id",
      headerName: t("account.history.account"),
      renderCell: (params) => (
        <Link component={RouterLink} to={CustomerRoutes.detail(params.row.account_id)}>
          {params.row.account_id}
        </Link>
      ),
      width: 100,
    },
    {
      field: "comment",
      headerName: t("account.history.comment"),
      flex: 1,
    },
    {
      field: "mapping_was_valid_until",
      headerName: t("account.history.validUntil"),
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
      sx={{ boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
