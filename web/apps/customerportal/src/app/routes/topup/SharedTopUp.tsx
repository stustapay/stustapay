import {
  useCheckSharedTopupCheckoutMutation,
  useCreateSharedTopupCheckoutMutation,
  useGetSharedTopupPublicInfoQuery,
} from "@/api";
import { PageContainer, SumupPaymentMethods } from "@/components";
import i18n from "@/i18n";
import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { Alert, AlertTitle, Box, Button, LinearProgress, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormCurrencyInput, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import type { SumUpCardInstance, SumUpResponseType } from "./SumUpCard";

const EXTENDED_CHECKOUT_POLL_INTERVAL_MS = 30 * 1000;
const GROUP_TOPUP_DISABLED_MESSAGE = "Group top-up is currently disabled";

const getRedirectOrderUUID = (locationSearch: string, tokenSearch?: string): string | null => {
  const queryValue = new URLSearchParams(locationSearch || tokenSearch || window.location.search || "").get("order_uuid");
  if (queryValue) {
    return queryValue;
  }
  return new URLSearchParams(window.location.href.split("?", 2)[1] ?? "").get("order_uuid");
};

const SharedTopUpSchema = z.object({
  contributor_name: z.string().trim().min(1, i18n.t("topup.shared.nameRequired")).max(80, i18n.t("topup.shared.nameTooLong")),
  amount: z.number().int(i18n.t("topup.errorAmountMustBeIntegral")).positive(i18n.t("topup.errorAmountGreaterZero")),
});

type SharedTopUpForm = z.infer<typeof SharedTopUpSchema>;

type SharedTopUpState =
  | { stage: "initial" }
  | { stage: "sumup"; checkoutId?: string; orderUUID: string }
  | { stage: "success" }
  | { stage: "error"; message?: string };

type SharedTopUpAction =
  | { type: "created-checkout"; checkoutId: string; orderUUID: string }
  | { type: "redirect-checkout"; orderUUID: string }
  | { type: "success" }
  | { type: "error"; message?: string }
  | { type: "reset" };

const reducer = (state: SharedTopUpState, action: SharedTopUpAction): SharedTopUpState => {
  switch (action.type) {
    case "created-checkout":
      if (state.stage !== "initial") {
        return state;
      }
      return { stage: "sumup", checkoutId: action.checkoutId, orderUUID: action.orderUUID };
    case "redirect-checkout":
      return { stage: "sumup", orderUUID: action.orderUUID };
    case "success":
      return { stage: "success" };
    case "error":
      return { stage: "error", message: action.message };
    case "reset":
      return { stage: "initial" };
  }
};

const isGroupTopupDisabledError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return false;
  }
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("detail" in data)) {
    return false;
  }
  return (data as { detail?: unknown }).detail === GROUP_TOPUP_DISABLED_MESSAGE;
};

export const SharedTopUp: React.FC = () => {
  const { t, i18n: reactI18n } = useTranslation();
  const { sharedTopupToken } = useParams();
  const location = useLocation();
  const [token, tokenSearch] = (sharedTopupToken ?? "").split("?", 2);
  const orderUUIDFromRedirect = React.useMemo(
    () => getRedirectOrderUUID(location.search, tokenSearch),
    [location.search, tokenSearch]
  );
  const { data: publicInfo, error: publicInfoError, isLoading: isPublicInfoLoading } = useGetSharedTopupPublicInfoQuery(
    { sharedTopupToken: token },
    { skip: token.length === 0 }
  );
  const [createCheckout] = useCreateSharedTopupCheckoutMutation();
  const [checkCheckout] = useCheckSharedTopupCheckoutMutation();
  const initialState: SharedTopUpState = orderUUIDFromRedirect
    ? { stage: "sumup", orderUUID: orderUUIDFromRedirect }
    : { stage: "initial" };
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [sumupMessage, setSumupMessage] = React.useState<string | null>(null);
  const sumupCard = React.useRef<SumUpCardInstance | undefined>(undefined);
  const pollTimeout = React.useRef<number | null>(null);
  const pollRun = React.useRef(0);
  const hasSeenAuthScreen = React.useRef(false);
  const hasShownPendingWarning = React.useRef(false);

  const clearPoll = () => {
    if (pollTimeout.current !== null) {
      window.clearTimeout(pollTimeout.current);
      pollTimeout.current = null;
    }
  };

  const unmountSumupCard = () => {
    if (sumupCard.current) {
      sumupCard.current.unmount();
      sumupCard.current = undefined;
    }
  };

  React.useEffect(() => {
    if (orderUUIDFromRedirect) {
      dispatch({ type: "redirect-checkout", orderUUID: orderUUIDFromRedirect });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [orderUUIDFromRedirect]);

  React.useEffect(() => {
    return () => {
      clearPoll();
      unmountSumupCard();
    };
  }, []);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      clearPoll();
      pollRun.current += 1;
      hasSeenAuthScreen.current = false;
      hasShownPendingWarning.current = false;
      setSumupMessage(null);
      unmountSumupCard();
      return;
    }

    const handleCheckoutStatus = (status: string) => {
      if (status === "PAID") {
        clearPoll();
        unmountSumupCard();
        dispatch({ type: "success" });
        return true;
      }

      if (status === "FAILED") {
        clearPoll();
        unmountSumupCard();
        dispatch({ type: "error", message: t("topup.cancelled.defaultMessage") });
        return true;
      }

      return false;
    };

    const enterExtendedPending = () => {
      setSumupMessage(t("topup.paymentTakingTooLong"));
      if (!hasShownPendingWarning.current) {
        hasShownPendingWarning.current = true;
        toast.warning(t("topup.paymentTakingTooLong"));
      }
    };

    const startPolling = (reason: Exclude<SumUpResponseType, "invalid">, startExtended = false) => {
      clearPoll();
      const currentPollRun = ++pollRun.current;
      const maxAttempts = reason === "success" ? 8 : 20;
      let attempt = startExtended ? maxAttempts : 0;

      const scheduleNextPoll = (delayMs: number) => {
        clearPoll();
        pollTimeout.current = window.setTimeout(() => {
          void poll();
        }, delayMs);
      };

      const poll = async () => {
        if (pollRun.current !== currentPollRun || state.stage !== "sumup") {
          return;
        }

        try {
          const resp = await checkCheckout({
            sharedTopupToken: token,
            checkSharedTopupCheckoutPayload: { order_uuid: state.orderUUID },
          }).unwrap();
          if (pollRun.current !== currentPollRun || state.stage !== "sumup") {
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
          if (pollRun.current !== currentPollRun || state.stage !== "sumup") {
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

      void poll();
    };

    hasSeenAuthScreen.current = false;
    hasShownPendingWarning.current = false;
    setSumupMessage(t("topup.processingPayment"));

    if (state.checkoutId && !sumupCard.current) {
      const config = {
        id: "sumup-card",
        checkoutId: state.checkoutId,
        locale: reactI18n.language,
        country: "DE",
        onLoad: () => setSumupMessage(t("topup.processingPayment")),
        onResponse: (type: SumUpResponseType, body?: unknown) => {
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
          if (type === "invalid") {
            return;
          }
          if (type === "auth-screen") {
            hasSeenAuthScreen.current = true;
          }
          setSumupMessage(type === "auth-screen" ? t("topup.awaiting3ds") : t("topup.processingPayment"));
          startPolling(type);
        },
      };
      try {
        sumupCard.current = SumUpCard.mount(config);
      } catch (e) {
        console.error("Error mounting SumUp card", e);
        dispatch({ type: "error", message: t("topup.error.message") });
      }
    } else if (!state.checkoutId) {
      setSumupMessage(t("topup.processingPayment"));
      startPolling("success");
    }
  }, [state, token, checkCheckout, reactI18n.language, t]);

  if (token.length === 0) {
    return <Navigate to="/login" />;
  }

  if (isPublicInfoLoading || (!publicInfo && !publicInfoError)) {
    return <Loading />;
  }

  const isCheckingExistingCheckout = state.stage === "sumup" && !state.checkoutId;

  if ((publicInfoError || !publicInfo) && !isCheckingExistingCheckout) {
    return (
      <PageContainer title={t("topup.shared.title")}>
        <Alert severity={isGroupTopupDisabledError(publicInfoError) ? "warning" : "error"}>
          {isGroupTopupDisabledError(publicInfoError) ? t("topup.shared.disabled") : t("topup.shared.invalidLink")}
        </Alert>
      </PageContainer>
    );
  }

  const onSubmit = (values: SharedTopUpForm, { setSubmitting }: FormikHelpers<SharedTopUpForm>) => {
    setSubmitting(true);
    createCheckout({
      sharedTopupToken: token,
      createSharedTopupCheckoutPayload: values,
    })
      .unwrap()
      .then((checkout) => {
        dispatch({ type: "created-checkout", checkoutId: checkout.checkout_id, orderUUID: checkout.order_uuid });
      })
      .catch((error) => {
        console.error(error);
        toast.error(isGroupTopupDisabledError(error) ? t("topup.shared.disabled") : t("topup.errorWhileCreatingCheckout"));
      })
      .finally(() => setSubmitting(false));
  };

  switch (state.stage) {
    case "initial":
      return (
        <PageContainer title={t("topup.shared.title")}>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              {t("topup.shared.description", { eventName: publicInfo?.event_name ?? "" })}
              <Box sx={{ mt: 1 }}>
                <SumupPaymentMethods paymentMethods={publicInfo?.payment_methods ?? []} />
              </Box>
            </Alert>
            <Formik
              initialValues={{ contributor_name: "", amount: 0 }}
              validationSchema={toFormikValidationSchema(SharedTopUpSchema)}
              onSubmit={onSubmit}
            >
              {(formik) => (
                <Form onSubmit={formik.handleSubmit}>
                  <Stack spacing={2}>
                    <FormTextField name="contributor_name" label={t("topup.shared.name")} variant="outlined" formik={formik} />
                    <FormCurrencyInput name="amount" label={t("topup.amount")} variant="outlined" formik={formik} />
                    {formik.isSubmitting && <LinearProgress />}
                    <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
                      {t("topup.next")}
                    </Button>
                  </Stack>
                </Form>
              )}
            </Formik>
          </Stack>
        </PageContainer>
      );
    case "sumup":
      return (
        <PageContainer title={t("topup.shared.title")}>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              {sumupMessage || t("topup.processingPayment")}
            </Alert>
            {state.checkoutId && <div id="sumup-card"></div>}
          </Stack>
        </PageContainer>
      );
    case "success":
      return (
        <PageContainer title={t("topup.shared.title")}>
          <Alert severity="success">
            <AlertTitle>{t("topup.success.title")}</AlertTitle>
            {t("topup.shared.success")}
          </Alert>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: "10em" }} />
          </Box>
        </PageContainer>
      );
    case "error":
      return (
        <PageContainer title={t("topup.shared.title")}>
          <Alert severity="error" action={<Button onClick={() => dispatch({ type: "reset" })}>{t("topup.tryAgain")}</Button>}>
            <AlertTitle>{t("topup.error.title")}</AlertTitle>
            {state.message || t("topup.error.message")}
          </Alert>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CancelIcon color="error" sx={{ fontSize: "10em" }} />
          </Box>
        </PageContainer>
      );
  }
};
