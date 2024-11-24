import { selectTillById, useCloseOutCashierMutation, useGetCashierQuery, useListTillsQuery } from "@/api";
import { UserSelect } from "@/components/features";
import { useCurrencyFormatter, useCurrentNode, useCurrentUser } from "@/hooks";
import {
  Alert,
  AlertTitle,
  Button,
  LinearProgress,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { CashingTextField, Loading } from "@stustapay/components";
import { FormNumericInput } from "@stustapay/form-components";
import { getUserName } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";
import { CashierRoutes, TillRoutes } from "@/app/routes";
import { CurrencyDenomination, useDenomination } from "./denominations";

type CloseOutValues = {
  comment: string;
  closingOutUserId: number;
  [key: string]: number | string;
};

const useCloseOutSchema = (denominiations: CurrencyDenomination[]) => {
  const currentUser = useCurrentUser();
  return React.useMemo(() => {
    const initialValues: CloseOutValues = {
      comment: "",
      closingOutUserId: currentUser?.id as unknown as number,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let schema: z.ZodObject<any> = z.object({
      comment: z.string(),
      closingOutUserId: z.number(),
    });

    for (const denominiation of denominiations) {
      schema = schema.extend({ [denominiation.key]: z.number() });
      initialValues[denominiation.key] = 0;
    }

    return { schema, initialValues };
  }, [denominiations, currentUser]);
};

const computeSum = (values: Record<string, number | string>, denominiations: CurrencyDenomination[]) => {
  let sum = 0;
  for (const denomination of denominiations) {
    const val = values[denomination.key];
    if (typeof val === "number") {
      sum += val * denomination.denomination;
    }
  }
  return sum;
};

const computeDifference = (
  values: Record<string, number | string>,
  denominiations: CurrencyDenomination[],
  targetBalance: number
): number => {
  return computeSum(values, denominiations) - targetBalance;
};

export const CashierCloseOut: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { cashierId } = useParams();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();

  const denominations = useDenomination();
  const { schema, initialValues } = useCloseOutSchema(denominations);

  const [closeOut] = useCloseOutCashierMutation();
  const { data: cashier, isLoading } = useGetCashierQuery({ nodeId: currentNode.id, cashierId: Number(cashierId) });
  const { data: tills, isLoading: isTillsLoading } = useListTillsQuery({ nodeId: currentNode.id });

  if (!cashier || isLoading || !tills || isTillsLoading) {
    return <Loading />;
  }

  const getTill = (id: number) => {
    if (!tills) {
      return undefined;
    }
    return selectTillById(tills, id);
  };

  const handleSubmit = (values: CloseOutValues, { setSubmitting }: FormikHelpers<CloseOutValues>) => {
    setSubmitting(true);
    closeOut({
      nodeId: currentNode.id,
      cashierId: Number(cashierId),
      closeOut: {
        comment: values.comment,
        actual_cash_drawer_balance: computeSum(values, denominations),
        closing_out_user_id: values.closingOutUserId,
      },
    })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(CashierRoutes.detail(cashierId));
      })
      .catch((err) => {
        setSubmitting(false);
      });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={getUserName(cashier)} />
        </ListItem>
      </Paper>

      {cashier.till_ids.length !== 0 && (
        <Alert severity="error">
          <AlertTitle>{t("closeOut.warningStillLoggedInTitle")}</AlertTitle>
          {t("closeOut.warningStillLoggedIn")}
          {cashier.till_ids.map((till_id) => (
            <RouterLink key={till_id} to={TillRoutes.detail(till_id, getTill(till_id)?.node_id)}>
              {getTill(till_id)?.name}
            </RouterLink>
          ))}
        </Alert>
      )}

      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={toFormikValidationSchema(schema)}>
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="right">{t("closeOut.denomination")}</TableCell>
                    <TableCell align="right">{t("closeOut.countedInDrawer")}</TableCell>
                    <TableCell align="right">{t("closeOut.sum")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {denominations.map((denomination) => (
                    <TableRow key={denomination.key}>
                      <TableCell align="right">{denomination.label}</TableCell>
                      <TableCell>
                        <FormNumericInput fullWidth name={denomination.key} formik={formik} />
                      </TableCell>
                      <TableCell align="right">
                        = {formatCurrency((formik.values[denomination.key] as number) * denomination.denomination)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell rowSpan={3} />
                    <TableCell align="right" sx={{ fontWeight: (theme) => theme.typography.fontWeightBold }}>
                      {t("closeOut.targetInDrawer")}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(cashier.cash_drawer_balance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: (theme) => theme.typography.fontWeightBold }} align="right">
                      {t("closeOut.sumInCashDrawer")}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(computeSum(formik.values, denominations))}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: (theme) => theme.typography.fontWeightBold }} align="right">
                      {t("closeOut.difference")}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(computeDifference(formik.values, denominations, cashier.cash_drawer_balance))} (
                      {(
                        Math.abs(
                          computeDifference(formik.values, denominations, cashier.cash_drawer_balance) /
                            cashier.cash_drawer_balance
                        ) * 100
                      ).toFixed(2)}
                      %)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Paper sx={{ mt: 2, p: 2 }}>
              <Stack spacing={2}>
                <UserSelect
                  label={t("closeOut.closingOutUser")}
                  value={formik.values.closingOutUserId}
                  onBlur={formik.handleBlur}
                  filterPrivilege="node_administration"
                  onChange={(val) => formik.setFieldValue("closingOutUserId", val)}
                  error={formik.touched.closingOutUserId && !!formik.errors.closingOutUserId}
                  helperText={(formik.touched.closingOutUserId && formik.errors.closingOutUserId) as string}
                />
                <CashingTextField
                  multiline
                  fullWidth
                  label={t("closeOut.comment")}
                  name="comment"
                  value={formik.values.comment}
                  onChange={(val) => formik.setFieldValue("comment", val)}
                  error={formik.touched.comment && !!formik.errors.comment}
                  helperText={(formik.touched.comment && formik.errors.comment) as string}
                />
                {formik.isSubmitting && <LinearProgress />}
                <Button type="submit" variant="outlined" disabled={formik.isSubmitting}>
                  {t("submit")}
                </Button>
              </Stack>
            </Paper>
            <CashierShiftStatsOverview cashierId={cashier.id} />
          </Form>
        )}
      </Formik>
    </Stack>
  );
};
