import * as React from "react";
import {
  Paper,
  ListItem,
  ListItemText,
  Table,
  TableHead,
  TableBody,
  TableContainer,
  TableRow,
  TableCell,
  LinearProgress,
  InputAdornment,
  TextField,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { selectCashierById, useCloseOutCashierMutation, useGetCashierByIdQuery } from "@api";
import { Loading } from "@stustapay/components";
import { useCurrencyFormatter, useCurrencySymbol } from "@hooks";
import { NumericInput } from "@components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { z } from "zod";
import { Formik, FormikHelpers } from "formik";
import { toast } from "react-toastify";
import { UserSelect } from "@components/UserSelect";

const CloseOutDataSchema = z.object({
  comment: z.string(),
  closingOutUserId: z.number(),
  coins: z.number(),
  bill5Euro: z.number(),
  bill10Euro: z.number(),
  bill20Euro: z.number(),
  bill50Euro: z.number(),
  bill100Euro: z.number(),
  bill200Euro: z.number(),
});
type CloseOutData = z.infer<typeof CloseOutDataSchema>;

const initialValues: CloseOutData = {
  comment: "",
  closingOutUserId: null as unknown as number,
  coins: 0,
  bill5Euro: 0,
  bill10Euro: 0,
  bill20Euro: 0,
  bill50Euro: 0,
  bill100Euro: 0,
  bill200Euro: 0,
};

const computeSum = (values: CloseOutData): number => {
  return (
    values.coins +
    values.bill5Euro * 5 +
    values.bill10Euro * 10 +
    values.bill20Euro * 20 +
    values.bill50Euro * 50 +
    values.bill100Euro * 100 +
    values.bill200Euro * 200
  );
};

const computeDifference = (values: CloseOutData, targetBalance: number): number => {
  return computeSum(values) - targetBalance;
};

export const CashierCloseOut: React.FC = () => {
  const { t } = useTranslation(["cashiers", "common"]);
  const { cashierId } = useParams();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();
  const currencySymbol = useCurrencySymbol();

  const [closeOut] = useCloseOutCashierMutation();
  const { cashier, isLoading } = useGetCashierByIdQuery(Number(cashierId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      cashier: data ? selectCashierById(data, Number(cashierId)) : undefined,
    }),
  });

  if (!cashier || isLoading) {
    return <Loading />;
  }

  const handleSubmit = (values: CloseOutData, { setSubmitting }: FormikHelpers<CloseOutData>) => {
    setSubmitting(true);
    closeOut({
      comment: values.comment,
      cashier_id: Number(cashierId),
      actual_cash_drawer_balance: computeSum(values),
      closing_out_user_id: values.closingOutUserId,
    })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(`/cashiers/${cashierId}`);
      })
      .catch((err) => {
        setSubmitting(false);
        console.log(err);
        toast.error(`Error while closing out cashier: ${err.toString()}`);
      });
  };

  return (
    <>
      <Paper>
        <ListItem>
          <ListItemText primary={cashier.display_name} />
        </ListItem>
      </Paper>

      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(CloseOutDataSchema)}
      >
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
          <>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("closeOut.start")}</TableCell>
                    <TableCell>{t("closeOut.targetInDrawer")}</TableCell>
                    <TableCell colSpan={3}>{t("closeOut.countedInDrawer")}</TableCell>
                    <TableCell>{t("closeOut.difference")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell rowSpan={7} colSpan={2} />
                    <TableCell align="right">{t("closeOut.coins")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.coins}
                        onChange={(val) => setFieldValue("coins", val)}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment>,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.coins)}</TableCell>
                    <TableCell rowSpan={7} />
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill5Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill5Euro}
                        onChange={(val) => setFieldValue("bill5Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill5Euro * 5)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill10Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill10Euro}
                        onChange={(val) => setFieldValue("bill10Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill10Euro * 10)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill20Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill20Euro}
                        onChange={(val) => setFieldValue("bill20Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill20Euro * 20)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill50Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill50Euro}
                        onChange={(val) => setFieldValue("bill50Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill50Euro * 50)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill100Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill100Euro}
                        onChange={(val) => setFieldValue("bill100Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill100Euro * 100)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.bill200Euro")}</TableCell>
                    <TableCell>
                      <NumericInput
                        fullWidth
                        value={values.bill200Euro}
                        onChange={(val) => setFieldValue("bill200Euro", val)}
                      />
                    </TableCell>
                    <TableCell align="right">= {formatCurrency(values.bill200Euro * 200)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: (theme) => theme.typography.fontWeightBold }}>
                      {t("closeOut.sum")}
                    </TableCell>
                    <TableCell colSpan={5} />
                  </TableRow>
                  <TableRow>
                    <TableCell align="right">{formatCurrency(0)}</TableCell>
                    <TableCell align="right">{formatCurrency(cashier.cash_drawer_balance)}</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell align="right">{formatCurrency(computeSum(values))}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(computeDifference(values, cashier.cash_drawer_balance))} (
                      {(
                        Math.abs(computeDifference(values, cashier.cash_drawer_balance) / cashier.cash_drawer_balance) *
                        100
                      ).toFixed(2)}
                      %)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Paper sx={{ mt: 2, p: 3 }}>
              <UserSelect
                fullWidth
                variant="standard"
                margin="normal"
                name="closingOutUserId"
                label={t("closeOut.closingOutUser")}
                value={values.closingOutUserId}
                onBlur={handleBlur}
                filterRole="finanzorga"
                onChange={(val) => setFieldValue("closingOutUserId", val)}
              />
              <TextField
                multiline
                fullWidth
                label={t("closeOut.comment")}
                name="comment"
                value={values.comment}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {isSubmitting && <LinearProgress />}
              <Button type="submit" onClick={() => handleSubmit()} disabled={isSubmitting}>
                {t("submit", { ns: "common" })}
              </Button>
            </Paper>
          </>
        )}
      </Formik>
    </>
  );
};
