import * as React from "react";
import {
  selectTillAll,
  selectTillProfileById,
  Till,
  useDeleteTillMutation,
  useListTillProfilesQuery,
  useListTillsQuery,
} from "@api";
import { Link, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Loading } from "@stustapay/components";
import { TillProfileRoutes, TillRoutes } from "@/app/routes";

export const TillList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { tills, isLoading: isTillsLoading } = useListTillsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      tills: data ? selectTillAll(data) : undefined,
    }),
  });
  const { data: profiles, isLoading: isProfilesLoading } = useListTillProfilesQuery();
  const [deleteTill] = useDeleteTillMutation();

  const [tillToDelete, setTillToDelete] = React.useState<number | null>(null);
  if (isTillsLoading || isProfilesLoading) {
    return <Loading />;
  }

  const renderProfile = (id: number | null) => {
    if (id == null || !profiles) {
      return "";
    }
    const profile = selectTillProfileById(profiles, id);
    if (!profile) {
      return "";
    }

    return (
      <Link component={RouterLink} to={TillProfileRoutes.detail(profile.id)}>
        {profile.name}
      </Link>
    );
  };

  const openConfirmDeleteDialog = (tillId: number) => {
    setTillToDelete(tillId);
  };

  const handleConfirmDeleteTill: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && tillToDelete !== null) {
      deleteTill({ tillId: tillToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setTillToDelete(null);
  };

  const columns: GridColDef<Till>[] = [
    {
      field: "name",
      headerName: t("till.name") as string,
      flex: 1,
      renderCell: (params) => (
        <Link component={RouterLink} to={TillRoutes.detail(params.row.id)}>
          {params.row.name}
        </Link>
      ),
    },
    {
      field: "description",
      headerName: t("till.description") as string,
      flex: 2,
    },
    {
      field: "tse_serial",
      headerName: t("till.tseSerial") as string,
      minWidth: 150,
    },
    {
      field: "profile",
      headerName: t("till.profile") as string,
      flex: 0.5,
      renderCell: (params) => renderProfile(params.row.active_profile_id),
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
          onClick={() => navigate(TillRoutes.edit(params.row.id))}
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
            <ButtonLink to={TillRoutes.add()} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("tills")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={tills ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("till.delete")}
        body={t("till.deleteDescription")}
        show={tillToDelete !== null}
        onClose={handleConfirmDeleteTill}
      />
    </Stack>
  );
};
