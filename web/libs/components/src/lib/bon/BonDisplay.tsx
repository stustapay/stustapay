import {
  Box,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import * as React from "react";
import { createCurrencyFormatter } from "@stustapay/framework";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import styles from "./BonDisplay.module.css";

type BonConfig = {
  title: string;
  issuer: string;
  address: string;
  ust_id: string;
};

type TaxRateAggregation = {
  tax_name: string;
  tax_rate: number;
  total_price: number;
  total_tax: number;
  total_no_tax: number;
};

type LineItem = {
  item_id: number;
  total_tax: number;
  quantity: number;
  product: { name: string }; // product
  product_price: number;
  tax_name: string;
  tax_rate: number;
  total_price: number;
};

type OrderWithTse = {
  id: number;
  uuid: string;

  total_price: number;
  total_tax: number;
  total_no_tax: number;
  cancels_order?: number | null;

  booked_at: string;
  payment_method: string;
  order_type: string;

  cashier_id?: number | null;
  till_id?: number | null;

  line_items: LineItem[];

  signature_status: string;
  transaction_process_type?: string | null;
  transaction_process_data?: string | null;
  tse_transaction?: string | null;
  tse_signaturenr?: string | null;
  tse_start?: string | null;
  tse_end?: string | null;
  tse_hashalgo?: string | null;
  tse_time_format?: string | null;
  tse_signature?: string | null;
  tse_public_key?: string | null;
  node_id: number;
  tse_qr_code_text: string;
};

export interface IBon {
  order: OrderWithTse;

  tax_rate_aggregations: TaxRateAggregation[];

  config: BonConfig;
  currency_identifier: string;
}

export interface BonProps {
  bon: IBon;
  bonLogoUrl?: string;
}

const useCurrencyFormatter = (bon: IBon) => {
  return React.useCallback(
    (value: number) => {
      return createCurrencyFormatter(bon.currency_identifier)(value);
    },
    [bon.currency_identifier]
  );
};

const BonHeader: React.FC<{ bon: IBon }> = ({ bon: { order, config } }) => {
  const { t } = useTranslation("common");

  return (
    <Stack spacing={1}>
      <Typography variant="h2" textAlign="center">
        {t("invoice")}
      </Typography>
      <Typography variant="h5" display="flex" justifyContent="space-between">
        <div>{t("bonHeader", { orderId: order.id.toString().padStart(10, "0") })}</div>
        <div>{new Date(order.booked_at).toLocaleDateString()}</div>
      </Typography>
      <Box display="flex" justifyContent="end">
        <Typography>
          {config.issuer}
          <br />
          {config.address}
          <br />
          {t("taxId", { id: config.ust_id })}
        </Typography>
      </Box>
    </Stack>
  );
};

const BonTotal: React.FC<{ bon: IBon }> = ({ bon }) => {
  const { t } = useTranslation("common");
  const { order, currency_identifier } = bon;
  const formatCurrency = useCurrencyFormatter(bon);

  return (
    <Box display="flex" justifyContent="end">
      <Typography variant="h5">
        {t("bonTotal", { total: formatCurrency(order.total_price), currencyId: currency_identifier })}
      </Typography>
    </Box>
  );
};

const LineItemTable: React.FC<{ bon: IBon }> = ({ bon }) => {
  const { t } = useTranslation("common");
  const { order } = bon;
  const formatCurrency = useCurrencyFormatter(bon);

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right" width="20px">
              {t("quantity")}
            </TableCell>
            <TableCell align="right">{t("product")}</TableCell>
            <TableCell align="right">{t("itemPrice")}</TableCell>
            <TableCell align="right">{t("total")}</TableCell>
            <TableCell align="left"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {order.line_items.map((item) => (
            <TableRow key={item.item_id}>
              <TableCell align="right">{item.quantity}x</TableCell>
              <TableCell align="right">{item.product.name}</TableCell>
              <TableCell align="right">{formatCurrency(item.product_price)}</TableCell>
              <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
              <TableCell align="left">[{item.tax_name}]</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const TaxRateTable: React.FC<{ bon: IBon }> = ({ bon }) => {
  const { t } = useTranslation("common");
  const { order, tax_rate_aggregations } = bon;
  const formatCurrency = useCurrencyFormatter(bon);

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right">{t("taxRatePercent")}</TableCell>
            <TableCell align="right">{t("withTax")}</TableCell>
            <TableCell align="right">{t("withoutTax")}</TableCell>
            <TableCell align="right">{t("totalTax")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tax_rate_aggregations.map((taxRate) => (
            <TableRow key={taxRate.tax_name}>
              <TableCell align="right">
                {taxRate.tax_name} = {(taxRate.tax_rate * 100).toFixed(0)}%
              </TableCell>
              <TableCell align="right">{formatCurrency(taxRate.total_price)}</TableCell>
              <TableCell align="right">{formatCurrency(taxRate.total_no_tax)}</TableCell>
              <TableCell align="right">{formatCurrency(taxRate.total_tax)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell align="right"></TableCell>
            <TableCell align="right">{formatCurrency(order.total_price)}</TableCell>
            <TableCell align="right">{formatCurrency(order.total_no_tax)}</TableCell>
            <TableCell align="right">{formatCurrency(order.total_tax)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SignatureDetails: React.FC<{ bon: IBon }> = ({ bon: { order } }) => {
  const { t } = useTranslation("common");
  return (
    <Paper>
      <TableContainer>
        <Table size="small" className={styles.tseTable}>
          <TableBody>
            <TableRow>
              <TableCell>{t("paymentMethod")}</TableCell>
              <TableCell>{order.payment_method}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("cashier")}</TableCell>
              <TableCell>{order.cashier_id}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("tillSerialNumber")}</TableCell>
              <TableCell>{order.till_id}</TableCell>
            </TableRow>
            {order.signature_status === "done" ? (
              <>
                <TableRow>
                  <TableCell>{t("transactionId")}</TableCell>
                  <TableCell>{order.tse_transaction}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseSignatureCounter")}</TableCell>
                  <TableCell>{order.tse_signaturenr}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseSignature")}</TableCell>
                  <TableCell sx={{ lineBreak: "anywhere" }}>{order.tse_signature}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseStartTime")}</TableCell>
                  <TableCell>{order.tse_start}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseEndTime")}</TableCell>
                  <TableCell>{order.tse_end}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tsePublicKey")}</TableCell>
                  <TableCell sx={{ lineBreak: "anywhere" }}>{order.tse_public_key}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseHashAlgo")}</TableCell>
                  <TableCell>{order.tse_hashalgo}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("tseTimeFormat")}</TableCell>
                  <TableCell>{order.tse_time_format}</TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell>{t("tse")}</TableCell>
                <TableCell>{t("tseFailed")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" alignItems="center" marginTop={3}>
        <Box maxWidth="400px">
          <QRCode
            size={256}
            style={{ height: "auto", width: "100%" }}
            value={order.tse_qr_code_text}
            viewBox={`0 0 256 256`}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export const BonDisplay: React.FC<BonProps> = ({ bon, bonLogoUrl }) => {
  return (
    <>
      {bonLogoUrl && <img src={bonLogoUrl} width="100%" alt="Logo" />}
      <Container>
        <Stack spacing={3}>
          <BonHeader bon={bon} />
          <LineItemTable bon={bon} />
          <BonTotal bon={bon} />
          <TaxRateTable bon={bon} />
          <SignatureDetails bon={bon} />
        </Stack>
      </Container>
    </>
  );
};
