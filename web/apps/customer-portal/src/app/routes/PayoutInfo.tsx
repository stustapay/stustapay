import * as React from "react";
import { useGetCustomerQuery, useUpdateCustomerInfoDonateAllMutation, useUpdateCustomerInfoMutation } from "@/api";
import { Loading, NumericInput } from "@stustapay/components";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { z } from "zod";
import iban from "iban";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export const PayoutInfo: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = usePublicConfig();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const [updateCustomerInfo] = useUpdateCustomerInfoMutation();
  const [updateCustomerDonateAll] = useUpdateCustomerInfoDonateAllMutation();

  const formatCurrency = useCurrencyFormatter();

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    toast.error(t("payout.errorFetchingData"));
    return <Navigate to="/" />;
  }

  const FormSchema = z.object({
    iban: z.string().superRefine((val, ctx) => {
      if (!iban.isValid(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.ibanNotValid"),
        });
      }
      if (!config.allowed_country_codes.includes(val.substring(0, 2))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.countryCodeNotSupported"),
        });
      }
    }),
    account_name: z.string(),
    email: z.string().email(),
    privacy_policy: z.boolean().refine((val) => val, {
      message: t("payout.mustAcceptPrivacyPolicy"),
    }),
    donation: z.number().superRefine((val, ctx) => {
      if (val < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.donationMustBePositive"),
        });
      }
      if (val > customer.balance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.donationExceedsBalance"),
        });
      }
    }),
  });
  type FormVal = z.infer<typeof FormSchema>;

  const initialValues: FormVal = {
    iban: customer.iban ?? "",
    account_name: customer.account_name ?? "",
    email: customer.email ?? "",
    privacy_policy: false,
    donation: customer.donation ?? 0.0,
  };

  const onSubmit = (values: FormVal, { setSubmitting }: FormikHelpers<FormVal>) => {
    setSubmitting(true);
    // Form data to the API server
    updateCustomerInfo({ customerBank: values })
      .unwrap()
      .then(() => {
        toast.success(t("payout.updatedBankData"));
        navigate("/");
        setSubmitting(false);
      })
      .catch((error) => {
        toast.error(t("payout.errorWhileUpdatingBankData"));
        console.error(error);
        setSubmitting(false);
      });
  };
  const onAllTipClick = () => {
    updateCustomerDonateAll()
      .unwrap()
      .then(() => {
        toast.success(t("payout.updatedBankData"));
        navigate("/");
      })
      .catch((error) => {
        toast.error(t("payout.errorWhileUpdatingBankData"));
        console.error(error);
      });
  };

  return (
    <Grid container justifyItems="center" justifyContent="center" sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t("payout.info")}
        </Alert>
        <h3>{t("payout.donationTitle")}</h3>
        <Button variant="contained" color="primary" sx={{ width: "100%" }} onClick={onAllTipClick}>
          {t("payout.donateRemainingBalanceOf") + formatCurrency(customer.balance)}
        </Button>

        <h3>{t("payout.payoutTitle")}</h3>
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(FormSchema)}
          onSubmit={onSubmit}
        >
          {(formik) => (
            <form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  id="iban"
                  name="iban"
                  label={t("payout.iban")}
                  variant="outlined"
                  required
                  fullWidth
                  value={formik.values.iban}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.iban && Boolean(formik.errors.iban)}
                  helperText={formik.touched.iban && formik.errors.iban}
                />
                <TextField
                  id="account_name"
                  name="account_name"
                  label={t("payout.bankAccountHolder")}
                  variant="outlined"
                  required
                  fullWidth
                  value={formik.values.account_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.account_name && Boolean(formik.errors.account_name)}
                  helperText={formik.touched.account_name && formik.errors.account_name}
                />
                <TextField
                  id="email"
                  name="email"
                  label={t("payout.email")}
                  variant="outlined"
                  required
                  fullWidth
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
                <FormControl error={Boolean(formik.errors.privacy_policy)}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="privacy_policy"
                        checked={formik.values.privacy_policy}
                        onChange={formik.handleChange}
                        color="primary"
                      />
                    }
                    label={
                      <Trans i18nKey="payout.privacyPolicyCheck">
                        please accept the
                        {/* TODO: remove config */}
                        {/* <Link href={config.data_privacy_url} target="_blank" rel="noopener"> */}
                        <Link component={RouterLink} to="/datenschutz" target="_blank" rel="noopener">
                          privacy policy
                        </Link>
                      </Trans>
                    }
                  />
                  {formik.touched.privacy_policy && (
                    <FormHelperText sx={{ ml: 0 }}>{formik.errors.privacy_policy}</FormHelperText>
                  )}
                </FormControl>
                <Typography>{t("payout.donationDescription")}</Typography>
                <NumericInput
                  name="donation"
                  label={t("payout.donationAmount") + `(max ${formatCurrency(customer.balance)})`}
                  variant="outlined"
                  fullWidth
                  value={formik.values.donation}
                  onChange={(val) => formik.setFieldValue("donation", val)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{config.currency_symbol}</InputAdornment>,
                  }}
                  error={formik.touched.donation && Boolean(formik.errors.donation)}
                  helperText={(formik.touched.donation && formik.errors.donation) as string}
                />
                <Button type="submit" variant="contained" color="primary" disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? "Submitting" : t("payout.submitPayoutData")}
                </Button>
              </Stack>
            </form>
          )}
        </Formik>
      </Grid>
    </Grid>
  );
};
