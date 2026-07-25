import { Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@stustapay/framework";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TseRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { Tse } from "@/db/api/generated";
import { getTseCollection } from "@/db/collections";
import {
  useCurrentNode,
  useCurrentUserHasPrivilege,
  useCurrentUserHasPrivilegeAtNode,
  useRenderNode,
} from "@/hooks";

export const TseList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const canManageTses = useCurrentUserHasPrivilege(TseRoutes.privilege);
  const canManageTsesAtNode = useCurrentUserHasPrivilegeAtNode(TseRoutes.privilege);
  const navigate = useNavigate();

  const { data: tses, isLoading: isTsesLoading } = useLiveQuery(
    (q) => q.from({ tses: getTseCollection(currentNode.id) }),
    [currentNode.id],
  );
  const { dataGridNodeColumn } = useRenderNode();

  const columns: GridColDef<Tse>[] = [
    {
      field: "name",
      headerName: t("tse.name"),
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TseRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "status",
      headerName: t("tse.status"),
    },
    {
      field: "type",
      headerName: t("tse.type"),
      minWidth: 120,
    },
    {
      field: "hashalgo",
      headerName: t("tse.hashalgo"),
      minWidth: 200,
    },
    {
      field: "time_format",
      headerName: t("tse.timeFormat"),
    },
    {
      field: "process_data_encoding",
      headerName: t("tse.processDataEncoding"),
    },
    dataGridNodeColumn,
  ];

  if (canManageTses) {
    columns.push({
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 150,
      getActions: (params) =>
        canManageTsesAtNode(params.row.node_id)
          ? [
              <GridActionsCellItem
                icon={<EditIcon />}
                color="primary"
                label={t("edit")}
                onClick={() => navigate(TseRoutes.edit(params.row.id, params.row.node_id))}
              />,
            ]
          : [],
    });
  }

  return (
    <ListLayout title={t("tse.tses")} routes={TseRoutes}>
      <DataGrid
        autoHeight
        loading={isTsesLoading}
        rows={tses ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
