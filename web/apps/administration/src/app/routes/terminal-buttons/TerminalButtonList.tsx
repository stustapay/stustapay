import * as React from "react";
import { Paper, Typography, ListItem, ListItemText } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColumns } from "@mui/x-data-grid";
import { useDeleteTerminalButtonMutation, useGetTerminalButtonsQuery } from "@api";
import { useTranslation } from "react-i18next";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { useNavigate } from "react-router-dom";
import { TerminalButton } from "@models";
import { Loading } from "@components/Loading";

export const TerminalButtonList: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const navigate = useNavigate();

  const { data: buttons, isLoading } = useGetTerminalButtonsQuery();
  const [deleteButton] = useDeleteTerminalButtonMutation();

  const [buttonToDelete, setButtonToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (buttonId: number) => {
    setButtonToDelete(buttonId);
  };

  const handleConfirmDeleteTaxRate: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && buttonToDelete !== null) {
      deleteButton(buttonToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setButtonToDelete(null);
  };

  const columns: GridColumns<TerminalButton> = [
    {
      field: "name",
      headerName: t("button.name") as string,
      flex: 1,
    },
    {
      field: "price",
      headerName: t("button.price") as string,
      type: "number",
      valueFormatter: ({ value }) => `${value} €`,
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
          onClick={() => navigate(`/terminal-buttons/${params.row.id}/edit`)}
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
            <ButtonLink to="/terminal-buttons/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("button.buttons")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        getRowId={(row) => row.name}
        rows={buttons ?? []}
        columns={columns}
        disableSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("button.delete")}
        body={t("button.deleteDescription")}
        show={buttonToDelete !== null}
        onClose={handleConfirmDeleteTaxRate}
      />
    </>
  );
};