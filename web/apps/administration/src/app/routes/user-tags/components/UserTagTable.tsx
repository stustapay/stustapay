import { UserTagDetailRead } from "@/api";
import { AccountRoutes, UserTagRoutes } from "@/app/routes";
import { useRenderNode } from "@/hooks";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export interface UserTagTableProps {
  userTags: UserTagDetailRead[];
}

export const UserTagTable: React.FC<UserTagTableProps> = ({ userTags }) => {
  const { t } = useTranslation();
  const renderNode = useRenderNode();

  const columns: GridColDef<UserTagDetailRead>[] = [
    {
      field: "user_tag_id",
      headerName: t("common.id") as string,
      renderCell: (params) => (
        <Link component={RouterLink} to={UserTagRoutes.detail(params.row.id)}>
          {params.row.id}
        </Link>
      ),
      minWidth: 250,
    },
    {
      field: "pin",
      headerName: t("userTag.pin") as string,
      minWidth: 300,
    },
    {
      field: "uid_hex",
      headerName: t("userTag.uid") as string,
      minWidth: 300,
    },
    {
      field: "account",
      headerName: t("userTag.account") as string,
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
      headerName: t("userTag.comment") as string,
      flex: 1,
    },
    {
      field: "node_id",
      headerName: t("common.definedAtNode") as string,
      valueFormatter: (value) => renderNode(value),
      flex: 1,
    },
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
