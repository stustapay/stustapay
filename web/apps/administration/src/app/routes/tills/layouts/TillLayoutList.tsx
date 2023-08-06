import { TillLayoutRoutes } from "@/app/routes";
import { selectTillLayoutAll, useDeleteTillLayoutMutation, useListTillLayoutsQuery } from "@api";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@components";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Link } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { TillLayout } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TillLayoutList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { layouts, isLoading: isTillsLoading } = useListTillLayoutsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      layouts: data ? selectTillLayoutAll(data) : undefined,
    }),
  });
  const [deleteTill] = useDeleteTillLayoutMutation();

  const [layoutToDelete, setLayoutToDelete] = React.useState<number | null>(null);
  if (isTillsLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setLayoutToDelete(tillId);
  };

  const handleConfirmDeleteLayout: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && layoutToDelete !== null) {
      deleteTill({ layoutId: layoutToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setLayoutToDelete(null);
  };

  const columns: GridColDef<TillLayout>[] = [
    {
      field: "name",
      headerName: t("layout.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillLayoutRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("layout.description") as string,
      flex: 2,
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
          onClick={() => navigate(TillLayoutRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <ListLayout title={t("layout.layouts")} routes={TillLayoutRoutes}>
      <DataGrid
        autoHeight
        rows={layouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("layout.delete")}
        body={t("layout.deleteDescription")}
        show={layoutToDelete !== null}
        onClose={handleConfirmDeleteLayout}
      />
    </ListLayout>
  );
};
