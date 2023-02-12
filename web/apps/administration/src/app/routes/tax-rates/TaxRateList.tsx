import * as React from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  Typography,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useDeleteTaxRateMutation, useGetTaxRatesQuery } from "../../../api";
import { useTranslation } from "react-i18next";
import { IconButtonLink, ButtonLink, ConfirmDialog, ConfirmDialogCloseHandler } from "../../../components";

export const TaxRateList: React.FC = () => {
  const { t } = useTranslation(["taxRates", "common"]);

  const { data: taxRates, isLoading } = useGetTaxRatesQuery();
  const [deleteTaxRate] = useDeleteTaxRateMutation();

  const [taxRateToDelete, setTaxRateToDelete] = React.useState<string | null>(null);
  if (isLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const openConfirmDeleteDialog = (taxRateName: string) => {
    setTaxRateToDelete(taxRateName);
  };

  const handleConfirmDeleteTaxRate: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && taxRateToDelete !== null) {
      deleteTaxRate(taxRateToDelete)
        .unwrap()
        .catch(() => undefined);
    }
    setTaxRateToDelete(null);
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <ButtonLink to="/tax-rates/new" endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </ButtonLink>
          }
        >
          <ListItemText primary={t("taxRates", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="taxRates">
          <TableHead>
            <TableRow>
              <TableCell>{t("taxRateName")}</TableCell>
              <TableCell align="right">{t("taxRateRate")}</TableCell>
              <TableCell>{t("taxRateDescription")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(taxRates ?? []).map((taxRate) => (
              <TableRow key={taxRate.name}>
                <TableCell>{taxRate.name}</TableCell>
                <TableCell align="right">{taxRate.rate}</TableCell>
                <TableCell>{taxRate.description}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/tax-rates/${taxRate.name}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="error" onClick={() => openConfirmDeleteDialog(taxRate.name)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        title={t("deleteTaxRate")}
        body={t("deleteTaxRateDescription")}
        show={taxRateToDelete !== null}
        onClose={handleConfirmDeleteTaxRate}
      />
    </>
  );
};
