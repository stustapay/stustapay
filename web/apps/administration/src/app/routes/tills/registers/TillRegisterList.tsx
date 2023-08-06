import * as React from "react";

import { Link, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "@components";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { getUserName, TillRegister } from "@stustapay/models";
import { Loading } from "@stustapay/components";
import {
  selectCashierById,
  selectTillById,
  selectTillRegisterAll,
  useDeleteRegisterMutation,
  useListCashiersQuery,
  useListCashRegistersAdminQuery,
  useListTillsQuery,
} from "@api";
import { useCurrencyFormatter } from "@hooks";
import { CashierRoutes, TillRegistersRoutes, TillRoutes } from "@/app/routes";

export const TillRegisterList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();

  const { data: tills } = useListTillsQuery();
  const { data: cashiers } = useListCashiersQuery();
  const { stockings: registers, isLoading } = useListCashRegistersAdminQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      stockings: data ? selectTillRegisterAll(data) : undefined,
    }),
  });
  const [deleteRegister] = useDeleteRegisterMutation();

  const [registerToDelete, setToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (tillId: number) => {
    setToDelete(tillId);
  };

  const handleConfirmDeleteProfile: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && registerToDelete !== null) {
      deleteRegister({ registerId: registerToDelete })
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
      <Link component={RouterLink} to={TillRoutes.detail(till.id)}>
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
      <Link component={RouterLink} to={CashierRoutes.detail(cashier.id)}>
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
          onClick={() => navigate(`${TillRegistersRoutes.detail(params.row.id)}/transfer`)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TillRegistersRoutes.edit(params.row.id))}
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
            <ButtonLink to={TillRegistersRoutes.add()} endIcon={<AddIcon />} variant="contained" color="primary">
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
        rows={registers ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("register.deleteRegister")}
        body={t("register.deleteRegisterDescription")}
        show={registerToDelete !== null}
        onClose={handleConfirmDeleteProfile}
      />
    </Stack>
  );
};
