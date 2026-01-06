import { selectEntryAreaAll, useListEntryAreasQuery } from "@/api";
import { EntryAreaRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { DataGrid, GridColDef } from "@stustapay/framework";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link, Tooltip } from "@mui/material";
import { EntryArea } from "@/api";

export const EntryAreaList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const { entryAreas, isLoading } = useListEntryAreasQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        entryAreas: data ? selectEntryAreaAll(data) : [],
      }),
    }
  );

  if (isLoading) {
    return <Loading />;
  }

  const columns: GridColDef<EntryArea>[] = [
    {
      field: "name",
      headerName: t("common.name"),
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.description}>
          <Link component={RouterLink} to={EntryAreaRoutes.detail(params.row.id)}>
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
    <ListLayout title={t("entry.areas")} routes={EntryAreaRoutes}>
      <DataGrid
        autoHeight
        rows={entryAreas ?? []}
        columns={columns}
        disableRowSelectionOnClick
        onRowDoubleClick={(row) => navigate(EntryAreaRoutes.detail(row.id))}
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
