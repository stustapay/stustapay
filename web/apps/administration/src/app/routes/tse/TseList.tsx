import { Tse, selectTseAll, useListTsesQuery } from "@/api";
import { TseRoutes } from "@/app/routes";
import { ListLayout } from "@/components";
import { Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TseList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { tses, isLoading: isTsesLoading } = useListTsesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      tses: data ? selectTseAll(data) : undefined,
    }),
  });
  //   const [deleteTse] = useDeleteTseMutation();

  //   const [tseToDelete, setTseToDelete] = React.useState<number | null>(null);
  if (isTsesLoading) {
    return <Loading />;
  }

  //   const openConfirmDeleteDialog = (tseId: number) => {
  //     setTseToDelete(tseId);
  //   };

  //   const handleConfirmDeleteTse: ConfirmDialogCloseHandler = (reason) => {
  //     if (reason === "confirm" && tseToDelete !== null) {
  //       deleteTse({ tseId: tseToDelete })
  //         .unwrap()
  //         .catch(() => undefined);
  //     }
  //     setTseToDelete(null);
  //   };

  const columns: GridColDef<Tse>[] = [
    {
      field: "name",
      headerName: t("tse.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TseRoutes.detail(params.row.tse_id)}>
          {params.row.tse_name}
        </Link>
      ),
    },
    {
      field: "tse_status",
      headerName: t("tse.status") as string,
    },
    {
      field: "tse_hashalgo",
      headerName: t("tse.hashalgo") as string,
    },
    {
      field: "tse_time_format",
      headerName: t("tse.timeFormat") as string,
    },
    {
      field: "tse_process_data_encoding",
      headerName: t("tse.processDataEncoding") as string,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TseRoutes.edit(params.row.tse_id))}
        />,
        // <GridActionsCellItem
        //   icon={<DeleteIcon />}
        //   color="error"
        //   label={t("delete")}
        //   onClick={() => openConfirmDeleteDialog(params.row.id)}
        // />,
      ],
    },
  ];

  return (
    <ListLayout title={t("tse.tses")} routes={TseRoutes}>
      <DataGrid
        autoHeight
        getRowId={(tse) => tse.tse_id}
        rows={tses ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      {/* <ConfirmDialog
        title={t("tse.delete")}
        body={t("tse.deleteDescription")}
        show={tseToDelete !== null}
        onClose={handleConfirmDeleteTse}
      /> */}
    </ListLayout>
  );
};
