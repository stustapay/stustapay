import { EntryGroup, selectEntryGroupAll, useListEntryGroupsQuery } from "@/api";
import { EntryGroupRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link, Tooltip } from "@mui/material";

export const EntryGroupList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const { entryGroups, isLoading } = useListEntryGroupsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        entryGroups: data ? selectEntryGroupAll(data) : [],
      }),
    }
  );

  if (isLoading) {
    return <Loading />;
  }

  const columns: GridColDef<EntryGroup>[] = [
    {
      field: "name",
      headerName: t("common.name"),
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.description}>
          <Link component={RouterLink} to={EntryGroupRoutes.detail(params.row.id)}>
            {params.row.name}
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "description",
      headerName: t("common.description"),
      flex: 1,
    },
  ];

  return (
    <ListLayout title={t("entry.groups")} routes={EntryGroupRoutes}>
      <DataGrid
        autoHeight
        rows={entryGroups ?? []}
        columns={columns}
        disableRowSelectionOnClick
        onRowDoubleClick={(row) => navigate(EntryGroupRoutes.detail(row.id))}
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
