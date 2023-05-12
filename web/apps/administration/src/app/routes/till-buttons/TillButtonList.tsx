import * as React from "react";
import { Paper, ListItem, ListItemText, Stack } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { selectTillButtonAll, useDeleteTillButtonMutation, useGetTillButtonsQuery } from "@api";
import { useTranslation } from "react-i18next";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { useNavigate } from "react-router-dom";
import { TillButton } from "@stustapay/models";
import { Loading } from "@stustapay/components";

export const TillButtonList: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const navigate = useNavigate();

  const { buttons, isLoading } = useGetTillButtonsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      buttons: data ? selectTillButtonAll(data) : undefined,
    }),
  });
  const [deleteButton] = useDeleteTillButtonMutation();

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

  const columns: GridColDef<TillButton>[] = [
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
          onClick={() => navigate(`/till-buttons/${params.row.id}/edit`)}
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
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/till-buttons/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("button.buttons")} />
        </ListItem>
      </Paper>
      <DataGrid
        autoHeight
        getRowId={(row) => row.name}
        rows={buttons ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("button.delete")}
        body={t("button.deleteDescription")}
        show={buttonToDelete !== null}
        onClose={handleConfirmDeleteTaxRate}
      />
    </Stack>
  );
};
