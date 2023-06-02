import * as React from "react";

import { Paper, Typography, ListItem, ListItemText, Stack, Link } from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { ConfirmDialog, ConfirmDialogCloseHandler, ButtonLink } from "@components";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { TillRegister, getUserName } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import {
  selectCashierById,
  selectTillById,
  selectTillRegisterAll,
  useDeleteTillRegisterMutation,
  useGetCashiersQuery,
  useGetTillRegistersQuery,
  useGetTillsQuery,
} from "@api";
import { useCurrencyFormatter } from "@hooks";

export const TillRegisterList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { data: tills } = useGetTillsQuery();
  const { data: cashiers } = useGetCashiersQuery();
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

  const renderTill = (id: number | null) => {
    if (id == null || !tills) {
      return "";
    }
    const till = selectTillById(tills, id);
    if (!till) {
      return "";
    }

    return (
      <Link component={RouterLink} to={`/tills/${till.id}`}>
        {till.name}
      </Link>
    );
  };

  const renderCashier = (id: number | null) => {
    if (id == null || !cashiers) {
      return "";
    }
    const cashier = selectCashierById(cashiers, id);
    if (!cashier) {
      return "";
    }

    return (
      <Link component={RouterLink} to={`/cashiers/${cashier.id}`}>
        {getUserName(cashier)}
      </Link>
    );
  };

  const columns: GridColDef<TillRegister>[] = [
    {
      field: "name",
      headerName: t("register.name") as string,
      flex: 1,
    },
    {
      field: "current_cashier_id",
      headerName: t("register.currentCashier") as string,
      width: 200,
      renderCell: (params) => renderCashier(params.row.current_cashier_id),
    },
    {
      field: "current_till_id",
      headerName: t("register.currentTill") as string,
      width: 200,
      renderCell: (params) => renderTill(params.row.current_till_id),
    },
    {
      field: "current_balance",
      headerName: t("register.currentBalance") as string,
      type: "number",
      valueFormatter: ({ value }) => formatCurrency(value),
      width: 200,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<SwapHorizIcon />}
          color="primary"
          label={t("register.transfer")}
          disabled={params.row.current_cashier_id == null}
          onClick={() => navigate(`/till-registers/${params.row.id}/transfer`)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(`/till-registers/${params.row.id}/edit`)}
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
            <ButtonLink to="/till-registers/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add")}
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
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteRegister")}
        body={t("register.deleteRegisterDescription")}
        show={stockingToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </Stack>
  );
};
