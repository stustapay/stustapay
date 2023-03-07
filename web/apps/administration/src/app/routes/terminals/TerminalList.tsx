import * as React from "react";
import { useDeleteTerminalMutation, useGetTerminalsQuery, useGetTerminalProfilesQuery } from "@api";
import { Paper, Typography, ListItem, ListItemText } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColumns } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Terminal } from "@models";
import { Loading } from "@components/Loading";

export const TerminalList: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const navigate = useNavigate();

  const { data: terminals, isLoading: isTerminalsLoading } = useGetTerminalsQuery();
  const { data: profiles, isLoading: isProfilesLoading } = useGetTerminalProfilesQuery();
  const [deleteTerminal] = useDeleteTerminalMutation();

  const [terminalToDelete, setTerminalToDelete] = React.useState<number | null>(null);
  if (isTerminalsLoading || isProfilesLoading) {
    return <Loading />;
  }

  const renderProfile = (id: number | null) => {
    if (id == null) {
      return "";
    }
    const profile = (profiles ?? []).find((profile) => profile.id === id);
    if (!profile) {
      return "";
    }

    return <RouterLink to={`/terminal-profiles/${profile.id}`}>{profile.name}</RouterLink>;
  };

  const openConfirmDeleteDialog = (terminalId: number) => {
    setTerminalToDelete(terminalId);
  };

  const handleConfirmDeleteTerminal: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && terminalToDelete !== null) {
      deleteTerminal(terminalToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setTerminalToDelete(null);
  };

  const columns: GridColumns<Terminal> = [
    {
      field: "name",
      headerName: t("terminalName") as string,
      flex: 1,
      renderCell: (params) => <RouterLink to={`/terminals/${params.row.id}`}>{params.row.name}</RouterLink>,
    },
    {
      field: "description",
      headerName: t("terminalDescription") as string,
      flex: 2,
    },
    {
      field: "profile",
      headerName: t("terminalProfile") as string,
      flex: 0.5,
      renderCell: (params) => renderProfile(params.row.active_profile_id),
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
          onClick={() => navigate(`/terminals/${params.row.id}/edit`)}
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
            <ButtonLink to="/terminals/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("terminals", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={terminals ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("terminal.delete")}
        body={t("terminal.deleteDescription")}
        show={terminalToDelete !== null}
        onClose={handleConfirmDeleteTerminal}
      />
    </>
  );
};
