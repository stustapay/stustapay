import { UserTagDetailRead } from "@/api";
import { AccountRoutes, UserTagRoutes } from "@/app/routes";
import { useRenderNode } from "@/hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface UserTagTableProps {
  userTags: UserTagDetailRead[];
}

export const UserTagTable: React.FC<UserTagTableProps> = ({ userTags }) => {
  const { t } = useTranslation();
  const { dataGridNodeColumn } = useRenderNode();

  const columns: GridColDef<UserTagDetailRead>[] = [
    {
      field: "user_tag_id",
      headerName: t("common.id"),
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
      minWidth: 250,
    },
    {
      field: "pin",
      headerName: t("userTag.pin"),
      minWidth: 300,
    },
    {
      field: "uid_hex",
      headerName: t("userTag.uid"),
      minWidth: 300,
    },
    {
      field: "account",
      headerName: t("userTag.account"),
      align: "right",
      renderCell: (params) =>
        params.row.account_id ? (
          <Link component={RouterLink} to={AccountRoutes.detail(params.row.account_id)}>
            {t("userTag.account")}
          </Link>
        ) : (
          ""
        ),
      width: 100,
    },
    {
      field: "comment",
      headerName: t("userTag.comment"),
      flex: 1,
    },
    dataGridNodeColumn,
  ];

  return (
    <DataGrid
      autoHeight
      rows={userTags}
      columns={columns}
      disableRowSelectionOnClick
      sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
    />
  );
};
