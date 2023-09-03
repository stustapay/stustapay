import { Tse, selectTseAll, useListTsesQuery } from "@/api";
import { TseRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { Link } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const TseList: React.FC = () => {
  const { t } = useTranslation();

  const { tses, isLoading: isTsesLoading } = useListTsesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      tses: data ? selectTseAll(data) : undefined,
    }),
  });
  if (isTsesLoading) {
    return <Loading />;
  }

  const columns: GridColDef<Tse>[] = [
    {
      field: "name",
      headerName: t("tse.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TseRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "status",
      headerName: t("tse.status") as string,
    },
    {
      field: "type",
      headerName: t("tse.type") as string,
      minWidth: 120,
    },
    {
      field: "hashalgo",
      headerName: t("tse.hashalgo") as string,
      minWidth: 200,
    },
    {
      field: "time_format",
      headerName: t("tse.timeFormat") as string,
    },
    {
      field: "process_data_encoding",
      headerName: t("tse.processDataEncoding") as string,
    },
  ];

  return (
    <ListLayout title={t("tse.tses")} routes={TseRoutes}>
      <DataGrid
        autoHeight
        rows={tses ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
};
