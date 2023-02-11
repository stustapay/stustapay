import * as React from "react";
import {
  Paper,
  Button,
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
import { useGetTaxRatesQuery } from "../../../api";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconButtonLink } from "../../../components/IconButtonLink";

export const TaxRateList: React.FC = () => {
  const { t } = useTranslation(["taxRates", "common"]);
  const navigate = useNavigate();

  const { data: taxRates, error, isLoading } = useGetTaxRatesQuery();

  if (isLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const addTaxRate = () => {
    navigate("/tax-rates/new");
  };

  const editTaxRate = (name: string) => {
    navigate(`/tax-rates/${name}/edit`);
  };

  const deleteTaxRate = (name: string) => {};

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <Button onClick={addTaxRate} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </Button>
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
                  <IconButton color="error" onClick={() => deleteTaxRate(taxRate.name)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
