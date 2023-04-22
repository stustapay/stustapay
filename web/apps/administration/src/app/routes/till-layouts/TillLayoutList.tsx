import * as React from "react";
import { selectTillLayoutAll, useDeleteTillLayoutMutation, useGetTillLayoutsQuery } from "@api";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Paper, Typography, ListItem, ListItemText } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { TillLayout } from "@models";
import { Loading } from "@stustapay/components";

export const TillLayoutList: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const navigate = useNavigate();

  const { layouts, isLoading: isTillsLoading } = useGetTillLayoutsQuery(undefined, {
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
      deleteTill(layoutToDelete)
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
      renderCell: (params) => <RouterLink to={`/till-layouts/${params.row.id}`}>{params.row.name}</RouterLink>,
    },
    {
      field: "description",
      headerName: t("layout.description") as string,
      flex: 2,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions", { ns: "common" }) as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit", { ns: "common" })}
          onClick={() => navigate(`/till-layouts/${params.row.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete", { ns: "common" })}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/till-layouts/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("layout.layouts")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={layouts ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("layout.delete")}
        body={t("layout.deleteDescription")}
        show={layoutToDelete !== null}
        onClose={handleConfirmDeleteLayout}
      />
    </>
  );
};
