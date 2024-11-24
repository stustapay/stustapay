import * as React from "react";
import {
  useGetCustomerQuery,
  usePayoutInfoQuery,
  useUpdateCustomerInfoDonateAllMutation,
  useUpdateCustomerInfoMutation,
} from "@/api";
import { useCurrencyFormatter } from "@/hooks";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Alert, Button, Grid, Link, Stack, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormCheckbox, FormCurrencyInput, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Formik, FormikHelpers } from "formik";
import iban from "iban";
import { Trans, useTranslation } from "react-i18next";
import { Navigate, useNavigate, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { useOpenModal } from "@stustapay/modal-provider";

export const PayoutInfo: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = usePublicConfig();
  const openModal = useOpenModal();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const [updateCustomerInfo] = useUpdateCustomerInfoMutation();
  const [updateCustomerDonateAll] = useUpdateCustomerInfoDonateAllMutation();
  const { data: payoutInfo, error: payoutInfoError, isLoading: isPayoutInfoLoading } = usePayoutInfoQuery();

  const formatCurrency = useCurrencyFormatter();

  if (isCustomerLoading || (!customer && !customerError) || isPayoutInfoLoading || (!payoutInfo && !payoutInfoError)) {
    return <Loading />;
  }

  if (customerError || !customer || payoutInfoError || !payoutInfo) {
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
      if (!config.allowed_country_codes?.includes(val.substring(0, 2))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.countryCodeNotSupported"),
        });
      }
    }),
    account_name: z.string().superRefine((val, ctx) => {
      if (!RegExp("^[a-zA-Z':,\\-()\\/ .]+$").test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("payout.nameHasSpecialChars"),
        });
      }
    }),
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

    const pushToServer = () => {
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

    if (values.donation > 0) {
      openModal({
        type: "confirm",
        title: t("payout.confirmDonateAmountTitle"),
        content: t("payout.confirmDonateAmountContent", { donation: formatCurrency(values.donation) }),
        closeOnBackdropClick: false,
        onConfirm: pushToServer,
        onCancel: () => setSubmitting(false),
      });
    } else {
      pushToServer();
    }
  };
  const onAllTipClick = () => {
    openModal({
      type: "confirm",
      title: t("payout.confirmDonateAllTitle"),
      content: t("payout.confirmDonateAllContent", { remainingBalance: formatCurrency(customer.balance) }),
      closeOnBackdropClick: false,
      onConfirm: () => {
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
      },
    });
  };

  let info_text: string;
  if (payoutInfo.in_payout_run && !payoutInfo.payout_date) {
    info_text = t("payout.infoPayoutScheduled");
  } else if (payoutInfo.in_payout_run && payoutInfo.payout_date) {
    info_text = t("payout.infoPayoutCompleted", { payout_date: new Date(payoutInfo.payout_date).toLocaleString() });
  } else if (customer.has_entered_info) {
    info_text = t("payout.infoPayoutInitiated");
  } else {
    info_text = t("payout.info");
  }

  let submit_text: string;
  if (!customer.has_entered_info) {
    submit_text = t("payout.submitPayoutData");
  } else {
    submit_text = t("payout.submitPayoutDataEdit");
  }

  return (
    <Grid container justifyItems="center" justifyContent="center" sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            {info_text}
          </Alert>
          <Typography variant="h5">{t("payout.donationTitle")}</Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ width: "100%" }}
            disabled={payoutInfo.in_payout_run}
            onClick={onAllTipClick}
          >
            {t("payout.donateRemainingBalanceOf", { remainingBalance: formatCurrency(customer.balance) })}
          </Button>

          <Typography variant="h5">{t("payout.payoutTitle")}</Typography>
          <Formik
            initialValues={initialValues}
            validationSchema={toFormikValidationSchema(FormSchema)}
            onSubmit={onSubmit}
          >
            {(formik) => (
              <form onSubmit={formik.handleSubmit}>
                <Stack spacing={2}>
                  <FormTextField
                    name="iban"
                    label={t("payout.iban")}
                    variant="outlined"
                    formik={formik}
                    disabled={payoutInfo.in_payout_run}
                  />
                  <FormTextField
                    name="account_name"
                    label={t("payout.bankAccountHolder")}
                    variant="outlined"
                    formik={formik}
                    disabled={payoutInfo.in_payout_run}
                  />
                  <FormTextField
                    name="email"
                    label={t("payout.email")}
                    variant="outlined"
                    formik={formik}
                    disabled={payoutInfo.in_payout_run}
                  />
                  <FormCheckbox
                    name="privacy_policy"
                    formik={formik}
                    color="primary"
                    disabled={payoutInfo.in_payout_run}
                    label={
                      <Trans i18nKey="payout.privacyPolicyCheck">
                        please accept the
                        <Link component={RouterLink} to={"/datenschutz"} target="_blank" rel="noopener">
                          privacy policy
                        </Link>
                      </Trans>
                    }
                  />
                  <Typography>{t("payout.donationDescription")}</Typography>
                  <FormCurrencyInput
                    name="donation"
                    label={t("payout.donationAmount") + `(max ${formatCurrency(customer.balance)})`}
                    variant="outlined"
                    formik={formik}
                    disabled={payoutInfo.in_payout_run}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={formik.isSubmitting || payoutInfo.in_payout_run}
                  >
                    {formik.isSubmitting ? "Submitting" : submit_text}
                  </Button>
                </Stack>
              </form>
            )}
          </Formik>
        </Stack>
      </Grid>
    </Grid>
  );
};
