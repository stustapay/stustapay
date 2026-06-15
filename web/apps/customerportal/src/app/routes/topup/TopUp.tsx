import {
  useCheckCheckoutMutation,
  useCreateCheckoutMutation,
  useGetCustomerQuery,
} from "@/api";
import { PageContainer, SumupPaymentMethods } from "@/components";
import { usePublicConfig } from "@/hooks";
import i18n from "@/i18n";
import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  LinearProgress,
  Link,
  Stack,
} from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormCurrencyInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import type { SumUpCard, SumUpCardInstance, SumUpResponseType } from "./SumUpCard";

const TopUpSchema = z.object({
  amount: z.number().int(i18n.t("topup.errorAmountMustBeIntegral")).positive(i18n.t("topup.errorAmountGreaterZero")),
});

const EXTENDED_CHECKOUT_POLL_INTERVAL_MS = 30 * 1000;
const STALLED_CHECKOUT_TIMEOUT_MS = 2 * 60 * 1000;
const QUICK_TOPUP_AMOUNTS = [10, 20, 50, 100];

type FormVal = z.infer<typeof TopUpSchema>;

const initialValues: FormVal = { amount: 0 };

declare global {
  const SumUpCard: SumUpCard;
}

type TopUpState =
  | { stage: "initial" }
  | { stage: "sumup"; topupAmount: number; checkoutId: string; orderUUID: string }
  | { stage: "success" }
  | { stage: "error"; message?: string }
  | { stage: "cancelled"; message?: string };

const initialState: TopUpState = { stage: "initial" };

type TopUpStateAction =
  | { type: "created-checkout"; topupAmount: number; checkoutId: string; orderUUID: string }
  | { type: "sumup-success" }
  | { type: "sumup-error"; message?: string }
  | { type: "sumup-cancelled"; message?: string }
  | { type: "reset" };

const reducer = (state: TopUpState, action: TopUpStateAction): TopUpState => {
  switch (action.type) {
    case "created-checkout":
      if (state.stage !== "initial") {
        return state;
      }
      return {
        stage: "sumup",
        topupAmount: action.topupAmount,
        checkoutId: action.checkoutId,
        orderUUID: action.orderUUID,
      };
    case "sumup-success":
      // Allow success transition from both "sumup" stage (normal flow) and "initial" stage (APM redirect)
      if (state.stage !== "sumup" && state.stage !== "initial") {
        return state;
      }
      return { stage: "success" };
    case "sumup-error":
      // Allow error transition from both "sumup" stage (normal flow) and "initial" stage (APM redirect)
      if (state.stage !== "sumup" && state.stage !== "initial") {
        return state;
      }
      return { stage: "error", message: action.message };
    case "sumup-cancelled":
      if (state.stage !== "sumup") {
        return state;
      }
      return { stage: "cancelled", message: action.message };
    case "reset":
      return initialState;
  }
};


// Remove local Container definition


type SumUpCardRespHandler = (type: SumUpResponseType, body?: unknown) => void;
type SumUpCardLoadHandler = () => void;

export const TopUp: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state: locationState } = useLocation();

  const config = usePublicConfig();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();
  const [createCheckout] = useCreateCheckoutMutation();
  const [checkCheckout] = useCheckCheckoutMutation();

  const sumupCard = React.useRef<SumUpCardInstance | undefined>(undefined);
  const handleSumupCardResp = React.useRef<SumUpCardRespHandler | undefined>(undefined);
  const handleSumupCardLoad = React.useRef<SumUpCardLoadHandler | undefined>(undefined);
  const checkoutPollTimeout = React.useRef<number | null>(null);
  const checkoutPollRun = React.useRef(0);
  const hasSeenAuthScreen = React.useRef(false);
  const hasShownPendingWarning = React.useRef(false);

  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [sumupMessage, setSumupMessage] = React.useState<string | null>(null);
  const [isExtendedPending, setIsExtendedPending] = React.useState(false);

  // Handle APM redirect navigation state
  React.useEffect(() => {
    if (locationState?.apmSuccess) {
      dispatch({ type: "sumup-success" });
    } else if (locationState?.apmError) {
      dispatch({ type: "sumup-error", message: t("topup.error.message") });
    }
  }, [locationState, t]);

  const reset = () => {
    dispatch({ type: "reset" });
  };

  const clearCheckoutPoll = () => {
    if (checkoutPollTimeout.current !== null) {
      window.clearTimeout(checkoutPollTimeout.current);
      checkoutPollTimeout.current = null;
    }
  };

  const unmountSumupCard = () => {
    if (sumupCard.current) {
      sumupCard.current.unmount();
      sumupCard.current = undefined;
    }
  };

  React.useEffect(() => {
    return () => {
      clearCheckoutPoll();
      unmountSumupCard();
    };
  }, []);

  React.useEffect(() => {
    if (state.stage === "sumup") {
      return;
    }

    clearCheckoutPoll();
    checkoutPollRun.current += 1;
    hasSeenAuthScreen.current = false;
    hasShownPendingWarning.current = false;
    setSumupMessage(null);
    setIsExtendedPending(false);
    unmountSumupCard();
  }, [state.stage]);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      return;
    }

    let active = true;

    checkCheckout({ checkCheckoutPayload: { order_uuid: state.orderUUID } })
      .unwrap()
      .then((resp) => {
        if (!active || state.stage !== "sumup") {
          return;
        }

        if (resp.status === "PAID") {
          clearCheckoutPoll();
          unmountSumupCard();
          dispatch({ type: "sumup-success" });
        } else if (resp.status === "FAILED") {
          clearCheckoutPoll();
          unmountSumupCard();
          dispatch({ type: "sumup-cancelled", message: t("topup.cancelled.message") });
        }
      })
      .catch(() => {
        // Ignore initial lookup errors and wait for the normal checkout flow.
      });

    return () => {
      active = false;
    };
  }, [checkCheckout, state, t]);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      return;
    }

    const enterExtendedPending = () => {
      setIsExtendedPending(true);
      setSumupMessage(t("topup.paymentTakingTooLong"));
      if (!hasShownPendingWarning.current) {
        hasShownPendingWarning.current = true;
        toast.warning(t("topup.paymentTakingTooLong"));
      }
    };

    const handleCheckoutStatus = (status: string) => {
      if (status === "PAID") {
        clearCheckoutPoll();
        unmountSumupCard();
        dispatch({ type: "sumup-success" });
        return true;
      }

      if (status === "FAILED") {
        clearCheckoutPoll();
        unmountSumupCard();
        dispatch({ type: "sumup-cancelled", message: t("topup.cancelled.message") });
        return true;
      }

      return false;
    };

    const startCheckoutStatusPolling = (reason: Exclude<SumUpResponseType, "invalid">, startExtended = false) => {
      if (state.stage !== "sumup") {
        return;
      }

      clearCheckoutPoll();
      const pollRun = ++checkoutPollRun.current;
      const maxAttempts = reason === "success" ? 8 : 20;
      let attempt = startExtended ? maxAttempts : 0;

      const scheduleNextPoll = (delayMs: number) => {
        clearCheckoutPoll();
        checkoutPollTimeout.current = window.setTimeout(() => {
          void pollCheckoutStatus();
        }, delayMs);
      };

      const pollCheckoutStatus = async () => {
        if (checkoutPollRun.current !== pollRun || state.stage !== "sumup") {
          return;
        }

        try {
          const resp = await checkCheckout({ checkCheckoutPayload: { order_uuid: state.orderUUID } }).unwrap();
          if (checkoutPollRun.current !== pollRun || state.stage !== "sumup") {
            return;
          }

          if (handleCheckoutStatus(resp.status)) {
            return;
          }

          attempt += 1;
          if (attempt >= maxAttempts) {
            enterExtendedPending();
            scheduleNextPoll(EXTENDED_CHECKOUT_POLL_INTERVAL_MS);
            return;
          }

          setSumupMessage(hasSeenAuthScreen.current ? t("topup.awaiting3ds") : t("topup.processingPayment"));
          scheduleNextPoll(reason === "success" ? Math.min(8000, 1000 * 2 ** (attempt - 1)) : 2000);
        } catch {
          if (checkoutPollRun.current !== pollRun || state.stage !== "sumup") {
            return;
          }

          attempt += 1;
          if (attempt >= 5) {
            enterExtendedPending();
            scheduleNextPoll(EXTENDED_CHECKOUT_POLL_INTERVAL_MS);
            return;
          }

          scheduleNextPoll(2000);
        }
      };

      void pollCheckoutStatus();
    };

    handleSumupCardResp.current = (type: SumUpResponseType, body?: unknown) => {
      if (state.stage !== "sumup") {
        return;
      }

      if (
        type === "invalid" &&
        body !== null &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        toast.error(body.message);
        return;
      }

      if (type === "sent") {
        setSumupMessage(t("topup.processingPayment"));
        startCheckoutStatusPolling(type);
        return;
      }

      if (type === "auth-screen") {
        hasSeenAuthScreen.current = true;
        setSumupMessage(t("topup.awaiting3ds"));
        startCheckoutStatusPolling(type);
        return;
      }

      if (type === "success") {
        setSumupMessage(t("topup.processingPayment"));
        startCheckoutStatusPolling(type);
        return;
      }

      if (type === "error") {
        setSumupMessage(
          hasSeenAuthScreen.current ? t("topup.awaiting3ds") : t("topup.processingPayment")
        );
        startCheckoutStatusPolling(type);
        return;
      }
    };

    handleSumupCardLoad.current = () => {
      setSumupMessage(t("topup.processingPayment"));
    };

    let stalledCheckoutActive = true;

    const stalledCheckoutTimeout = window.setTimeout(() => {
      if (state.stage !== "sumup" || isExtendedPending) {
        return;
      }

      checkCheckout({ checkCheckoutPayload: { order_uuid: state.orderUUID } })
        .unwrap()
        .then((resp) => {
          if (!stalledCheckoutActive || state.stage !== "sumup") {
            return;
          }

          if (handleCheckoutStatus(resp.status)) {
            return;
          }

          enterExtendedPending();
          startCheckoutStatusPolling("error", true);
        })
        .catch(() => {
          if (!stalledCheckoutActive) {
            return;
          }

          enterExtendedPending();
          startCheckoutStatusPolling("error", true);
        });
    }, STALLED_CHECKOUT_TIMEOUT_MS);

    return () => {
      stalledCheckoutActive = false;
      window.clearTimeout(stalledCheckoutTimeout);
    };
  }, [checkCheckout, dispatch, isExtendedPending, state, t]);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      return;
    }

    hasSeenAuthScreen.current = false;
    hasShownPendingWarning.current = false;
    setIsExtendedPending(false);
    setSumupMessage(t("topup.processingPayment"));

    const config = {
      id: "sumup-card",
      checkoutId: state.checkoutId,
      onLoad: handleSumupCardLoad.current,
      onResponse: handleSumupCardResp.current,
      locale: i18n.language,
      // Enable alternative payment methods if available for the merchant
      country: "DE",
    };
    if (sumupCard.current) {
      sumupCard.current.update(config);
    } else {
      try {
        sumupCard.current = SumUpCard.mount(config);
        // sumupCard.current = SumUpCardMock.mount(config);
      } catch (e) {
        console.error("Error mounting SumUp card", e);
        dispatch({ type: "sumup-error", message: t("topup.error.message") });
      }
    }
  }, [state, i18n.language, dispatch, t]);

  if (!config.sumup_topup_enabled) {
    toast.error(t("topup.sumupTopupDisabled"));
    return <Navigate to="/" />;
  }

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    toast.error("Error loading customer");
    return <Navigate to="/" />;
  }

  const onSubmit = (values: FormVal, { setSubmitting }: FormikHelpers<FormVal>) => {
    setSubmitting(true);
    createCheckout({ createCheckoutPayload: values })
      .unwrap()
      .then((checkout) => {
        dispatch({
          type: "created-checkout",
          checkoutId: checkout.checkout_id,
          topupAmount: values.amount,
          orderUUID: checkout.order_uuid,
        });
        setSubmitting(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("topup.errorWhileCreatingCheckout"));
        setSubmitting(false);
      });
  };

  switch (state.stage) {
    case "initial":
      return (
        <PageContainer title={t("topup.onlineTopUp")}>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            <SumupPaymentMethods paymentMethods={config.sumup_topup_payment_methods} />
          </Alert>
          <Formik
            initialValues={initialValues}
            validationSchema={toFormikValidationSchema(TopUpSchema)}
            validateOnMount
            onSubmit={onSubmit}
          >
            {(formik) => (
              <Form onSubmit={formik.handleSubmit}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {QUICK_TOPUP_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={formik.values.amount === amount ? "contained" : "outlined"}
                        color="primary"
                        aria-pressed={formik.values.amount === amount}
                        onClick={() => {
                          void formik.setFieldValue("amount", amount, true);
                          void formik.setFieldTouched("amount", true, false);
                        }}
                        sx={{ minWidth: 88 }}
                      >
                        {amount} EUR
                      </Button>
                    ))}
                  </Stack>
                  <FormCurrencyInput
                    name="amount"
                    label={t("topup.amount")}
                    variant="outlined"
                    formik={formik}
                    helperText={t("topup.amountHelper")}
                    parseOnChange
                    integerOnly
                  />
                  {formik.isSubmitting && <LinearProgress />}
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={formik.isSubmitting || !formik.values.amount || formik.values.amount <= 0 || !formik.isValid}
                  >
                    {t("topup.next")}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </PageContainer>
      );
    case "sumup":
      return (
        <PageContainer title={t("topup.onlineTopUp")}>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              {sumupMessage || t("topup.processingPayment")}
            </Alert>
            <div id="sumup-card"></div>
          </Stack>
        </PageContainer>
      );
    case "success":
      return (
        <PageContainer title={t("topup.onlineTopUp")}>
          <Alert severity="success">
            <AlertTitle>{t("topup.success.title")}</AlertTitle>
            <Trans i18nKey={"topup.success.message"}>
              continue to to the
              <Link component={RouterLink} to="/">
                overview page
              </Link>
            </Trans>
          </Alert>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              mt: 4
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: "10em" }} />
          </Box>
        </PageContainer>
      );
    case "error":
      return (
        <PageContainer title={t("topup.onlineTopUp")}>
          <Alert severity="error" action={<Button onClick={reset} color="inherit" size="small">{t("topup.tryAgain")}</Button>}>
            <AlertTitle>{t("topup.error.title")}</AlertTitle>
            {state.message || t("topup.error.message")}
          </Alert>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              mt: 4
            }}
          >
            <CancelIcon color="error" sx={{ fontSize: "10em" }} />
          </Box>
        </PageContainer>
      );
    case "cancelled":
      return (
        <PageContainer title={t("topup.onlineTopUp")}>
          <Alert severity="warning">
            <AlertTitle>{t("topup.cancelled.title")}</AlertTitle>
            {state.message || t("topup.cancelled.defaultMessage")}
          </Alert>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mt: 4,
              flexDirection: "column"
            }}
          >
            <CancelIcon color="warning" sx={{ fontSize: "10em", mb: 2 }} />
            <Button
              onClick={reset}
              variant="contained"
              color="primary"
            >
              {t("topup.tryAgain")}
            </Button>
          </Box>
        </PageContainer>
      );
  }
};
