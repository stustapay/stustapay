import * as React from "react";

import { Paper, Typography, ListItem, ListItemText } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { useNavigate } from "react-router-dom";
import { TillRegister } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import { selectTillRegisterAll, useDeleteTillRegisterMutation, useGetTillRegistersQuery } from "@api";

export const TillRegisterList: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const navigate = useNavigate();

  const { stockings, isLoading } = useGetTillRegistersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      stockings: data ? selectTillRegisterAll(data) : undefined,
    }),
  });
  const [deleteRegister] = useDeleteTillRegisterMutation();

  const [stockingToDelete, setToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && stockingToDelete !== null) {
      deleteRegister(stockingToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setToDelete(null);
  };

  const columns: GridColDef<TillRegister>[] = [
    {
      field: "name",
      headerName: t("register.name") as string,
      flex: 1,
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
          onClick={() => navigate(`/till-registers/${params.row.id}/edit`)}
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
            <ButtonLink to="/till-registers/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("register.registers")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={stockings ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ mt: 2, p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteRegister")}
        body={t("register.deleteRegisterDescription")}
        show={stockingToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </>
  );
};
