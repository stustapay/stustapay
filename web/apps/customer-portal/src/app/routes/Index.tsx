import { Link as RouterLink } from "react-router-dom";
import { useGetCustomerQuery } from "@/api/customerApi";
import { Card, Link, Alert, Grid } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { toast } from "react-toastify";
import { useTranslation, Trans } from "react-i18next";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { OrderList } from "./OrderList";

export const Index: React.FC = () => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    toast.error(t("errorLoadingCustomer"));
    // navigate(-1); // this will cause infinite redirect loops if the backend is not running
    return null;
  }

  // TODO: depending on the order_type we want to show different stuff
  // we also might want to show the balance of the account after each order

  return (
    <Grid container justifyItems="center" justifyContent="center">
      <Grid item xs={8}>
        <Card
          variant="outlined"
          style={{
            justifyContent: "center",
            textAlign: "center",
            fontSize: "2.5em",
            marginBottom: "1em",
            border: "none",
            marginTop: "1em",
          }}
        >
          <span>{formatCurrency(customer.balance)}</span>
        </Card>

        <Alert severity="info" variant="outlined" style={{ marginBottom: "1em", width: "100%" }}>
          <Trans i18nKey="payoutInfo">
            to get your payout
            <Link component={RouterLink} to="/payout-info">
              enter bank account details here
            </Link>
          </Trans>
        </Alert>
        <OrderList />
      </Grid>
    </Grid>
  );
};
