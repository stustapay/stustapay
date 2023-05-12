import * as React from "react";

import { Paper, Typography, ListItem, ListItemText, Stack } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { useNavigate } from "react-router-dom";
import { TillRegisterStocking } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import {
  selectTillRegisterStockingAll,
  useDeleteTillRegisterStockingMutation,
  useGetTillRegisterStockingsQuery,
} from "@api";
import { useCurrencyFormatter } from "@hooks";

export const TillRegisterStockingList: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { stockings, isLoading } = useGetTillRegisterStockingsQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      stockings: data ? selectTillRegisterStockingAll(data) : undefined,
    }),
  });
  const [deleteStocking] = useDeleteTillRegisterStockingMutation();

  const [stockingToDelete, setStockingToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setStockingToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && stockingToDelete !== null) {
      deleteStocking(stockingToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setStockingToDelete(null);
  };

  const columns: GridColDef<TillRegisterStocking>[] = [
    {
      field: "name",
      headerName: t("register.name") as string,
      flex: 1,
    },
    {
      field: "total",
      headerName: t("register.stockingTotal") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
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
          onClick={() => navigate(`/till-register-stockings/${params.row.id}/edit`)}
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
            <ButtonLink to="/till-register-stockings/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("register.stockings")} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <DataGrid
        autoHeight
        rows={stockings ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteStocking")}
        body={t("register.deleteStockingDescription")}
        show={stockingToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </Stack>
  );
};
