import * as React from "react";
import { selectTillLayoutAll, useDeleteTillLayoutMutation, useListTillLayoutsQuery } from "@api";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Link, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { TillLayout } from "@stustapay/models";
import { Loading } from "@stustapay/components";

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
        <Link component={RouterLink} to={`/till-layouts/${params.row.id}`}>
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
          onClick={() => navigate(`/till-layouts/${params.row.id}/edit`)}
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
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/till-layouts/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
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
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("layout.delete")}
        body={t("layout.deleteDescription")}
        show={layoutToDelete !== null}
        onClose={handleConfirmDeleteLayout}
      />
    </Stack>
  );
};
