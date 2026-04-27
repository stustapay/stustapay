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
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import type { SumUpCardInstance, SumUpResponseType } from "./SumUpCard";

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

export const SharedTopUp: React.FC = () => {
  const { t, i18n: reactI18n } = useTranslation();
  const { sharedTopupToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = sharedTopupToken ?? "";
  const { data: publicInfo, error: publicInfoError, isLoading: isPublicInfoLoading } = useGetSharedTopupPublicInfoQuery(
    { sharedTopupToken: token },
    { skip: token.length === 0 }
  );
  const [createCheckout] = useCreateSharedTopupCheckoutMutation();
  const [checkCheckout] = useCheckSharedTopupCheckoutMutation();
  const [state, dispatch] = React.useReducer(reducer, { stage: "initial" });
  const [sumupMessage, setSumupMessage] = React.useState<string | null>(null);
  const sumupCard = React.useRef<SumUpCardInstance | undefined>(undefined);
  const pollTimeout = React.useRef<number | null>(null);

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
    const orderUUID = searchParams.get("order_uuid");
    if (orderUUID) {
      dispatch({ type: "redirect-checkout", orderUUID });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  React.useEffect(() => {
    return () => {
      clearPoll();
      unmountSumupCard();
    };
  }, []);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      clearPoll();
      unmountSumupCard();
      return;
    }

    let attempt = 0;
    const poll = async () => {
      try {
        const resp = await checkCheckout({
          sharedTopupToken: token,
          checkSharedTopupCheckoutPayload: { order_uuid: state.orderUUID },
        }).unwrap();
        if (resp.status === "PAID") {
          clearPoll();
          unmountSumupCard();
          dispatch({ type: "success" });
          return;
        }
        if (resp.status === "FAILED") {
          clearPoll();
          unmountSumupCard();
          dispatch({ type: "error", message: t("topup.cancelled.defaultMessage") });
          return;
        }
        attempt += 1;
        setSumupMessage(t("topup.processingPayment"));
        if (attempt < 30) {
          pollTimeout.current = window.setTimeout(poll, 2000);
        } else {
          setSumupMessage(t("topup.paymentTakingTooLong"));
        }
      } catch {
        dispatch({ type: "error", message: t("topup.error.message") });
      }
    };

    if (state.checkoutId) {
      const config = {
        id: "sumup-card",
        checkoutId: state.checkoutId,
        locale: reactI18n.language,
        country: "DE",
        onLoad: () => setSumupMessage(t("topup.processingPayment")),
        onResponse: (type: SumUpResponseType) => {
          if (type === "invalid") {
            return;
          }
          setSumupMessage(type === "auth-screen" ? t("topup.awaiting3ds") : t("topup.processingPayment"));
          clearPoll();
          pollTimeout.current = window.setTimeout(poll, 500);
        },
      };
      try {
        sumupCard.current = SumUpCard.mount(config);
      } catch (e) {
        console.error("Error mounting SumUp card", e);
        dispatch({ type: "error", message: t("topup.error.message") });
      }
    } else {
      setSumupMessage(t("topup.processingPayment"));
      void poll();
    }
  }, [state, token, checkCheckout, reactI18n.language, t]);

  if (token.length === 0) {
    return <Navigate to="/login" />;
  }

  if (isPublicInfoLoading || (!publicInfo && !publicInfoError)) {
    return <Loading />;
  }

  if (publicInfoError || !publicInfo) {
    return (
      <PageContainer title={t("topup.shared.title")}>
        <Alert severity="error">{t("topup.shared.invalidLink")}</Alert>
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
        toast.error(t("topup.errorWhileCreatingCheckout"));
      })
      .finally(() => setSubmitting(false));
  };

  switch (state.stage) {
    case "initial":
      return (
        <PageContainer title={t("topup.shared.title")}>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              {t("topup.shared.description", { eventName: publicInfo.event_name })}
              <Box sx={{ mt: 1 }}>
                <SumupPaymentMethods paymentMethods={publicInfo.payment_methods} />
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
