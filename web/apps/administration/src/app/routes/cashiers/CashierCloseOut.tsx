import {
  Alert,
  AlertTitle,
  Box,
  Button,
  LinearProgress,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CashingTextField, Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { selectTerminalById, useCloseOutCashierMutation, useGetUserQuery, useListTerminalsQuery } from "@/api";
import { TerminalRoutes, UserRoutes } from "@/app/routes";
import {
  cashRegisterStockingDenominationFields,
  computeStockingTotal,
  defaultCashRegisterStockingDenominationValues,
  StockingDenominationValues,
} from "@/app/routes/tills/stockings/stockingDenominations";
import { StockingMakeupFormTable } from "@/app/routes/tills/stockings/StockingMakeupFormTable";
import { UserSelect } from "@/components/features";
import { useCurrencyFormatter, useCurrentNode, useCurrentUser } from "@/hooks";

import { CashierShiftStatsOverview } from "./CashierShiftStatsOverview";

type CloseOutValues = StockingDenominationValues & {
  comment: string;
  closingOutUserId: number;
};

const useCloseOutSchema = () => {
  const currentUser = useCurrentUser();
  return React.useMemo(() => {
    const initialValues: CloseOutValues = {
      ...defaultCashRegisterStockingDenominationValues,
      variable_in_euro: 0,
      comment: "",
      closingOutUserId: currentUser?.id as unknown as number,
    };

    const denominationSchema = Object.fromEntries(
      cashRegisterStockingDenominationFields.map((field) => [field, z.number()])
    );

    const schema = z.object({
      comment: z.string(),
      closingOutUserId: z.number(),
      variable_in_euro: z.number(),
      ...denominationSchema,
    });

    return { schema, initialValues };
  }, [currentUser]);
};

export const CashierCloseOut: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();

  const { schema, initialValues } = useCloseOutSchema();

  const [closeOut] = useCloseOutCashierMutation();
  const { data: user, isLoading } = useGetUserQuery({
    nodeId: currentNode.id,
    userId: Number(userId),
  });
  const { data: terminals, isLoading: isTerminalsLoading } = useListTerminalsQuery({
    nodeId: currentNode.id,
  });

  if (!user || isLoading || !terminals || isTerminalsLoading) {
    return <Loading />;
  }

  const getTerminal = (id: number) => {
    if (!terminals) {
      return undefined;
    }
    return selectTerminalById(terminals, id);
  };

  const handleSubmit = (values: CloseOutValues, { setSubmitting }: FormikHelpers<CloseOutValues>) => {
    setSubmitting(true);
    closeOut({
      nodeId: currentNode.id,
      cashierId: Number(userId),
      closeOut: {
        comment: values.comment,
        actual_cash_drawer_balance: computeStockingTotal(values),
        closing_out_user_id: values.closingOutUserId,
      },
    })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(UserRoutes.detail(Number(userId)));
      })
      .catch((_err) => {
        setSubmitting(false);
      });
  };

  const cashDrawerBalance = user.cash_drawer_balance;

  if (cashDrawerBalance == null) {
    return <Alert severity="error">{t("closeOut.noCashDrawerWarning")}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={getUserName(user)} />
        </ListItem>
      </Paper>

      {user.terminal_ids.length !== 0 && (
        <Alert severity="error">
          <AlertTitle>{t("closeOut.warningStillLoggedInTitle")}</AlertTitle>
          {t("closeOut.warningStillLoggedIn")}
          {user.terminal_ids.map((id) => (
            <RouterLink key={id} to={TerminalRoutes.detail(id, getTerminal(id)?.node_id)}>
              {getTerminal(id)?.name}
            </RouterLink>
          ))}
        </Alert>
      )}

      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={toFormikValidationSchema(schema)}>
        {(formik) => {
          const countedTotal = computeStockingTotal(formik.values);
          const difference = countedTotal - cashDrawerBalance;

          return (
            <Form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <StockingMakeupFormTable
                  formik={formik}
                  title={t("closeOut.countedInDrawer")}
                  totalLabel={t("closeOut.sumInCashDrawer")}
                />
                <Paper sx={{ px: 2, py: 1.5 }}>
                  <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: (theme) => theme.typography.fontWeightBold, mr: 2 }}>
                        {t("closeOut.targetInDrawer")}
                      </Box>
                      {formatCurrency(cashDrawerBalance)}
                    </Typography>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: (theme) => theme.typography.fontWeightBold, mr: 2 }}>
                        {t("closeOut.difference")}
                      </Box>
                      {formatCurrency(difference)} (
                      {cashDrawerBalance !== 0
                        ? ((Math.abs(difference / cashDrawerBalance) * 100).toFixed(2) as string)
                        : "—"}
                      %)
                    </Typography>
                  </Stack>
                </Paper>
                <Paper sx={{ p: 2 }}>
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
                <CashierShiftStatsOverview cashierId={user.id} />
              </Stack>
            </Form>
          );
        }}
      </Formik>
    </Stack>
  );
};
