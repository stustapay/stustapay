import { useCheckCheckoutMutation, useCreateCheckoutMutation, useGetCustomerQuery } from "@/api";
import { usePublicConfig } from "@/hooks";
import i18n from "@/i18n";
import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { Alert, AlertTitle, Box, Button, Grid, LinearProgress, Link, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormCurrencyInput } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Navigate, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import type { SumUpCard, SumUpCardInstance, SumUpResponseType } from "./SumUpCard";

const TopUpSchema = z.object({
  amount: z.number().int(i18n.t("topup.errorAmountMustBeIntegral")).positive(i18n.t("topup.errorAmountGreaterZero")),
});

type FormVal = z.infer<typeof TopUpSchema>;

const initialValues: FormVal = { amount: 0 };

declare global {
  const SumUpCard: SumUpCard;
}

type TopUpState =
  | { stage: "initial" }
  | { stage: "sumup"; topupAmount: number; checkoutId: string }
  | { stage: "success" }
  | { stage: "error"; message?: string };

const initialState: TopUpState = { stage: "initial" };

type TopUpStateAction =
  | { type: "created-checkout"; topupAmount: number; checkoutId: string }
  | { type: "sumup-success" }
  | { type: "sumup-error"; message?: string }
  | { type: "reset" };

const reducer = (state: TopUpState, action: TopUpStateAction): TopUpState => {
  console.log("processing action", action, "prev state", state);
  switch (action.type) {
    case "created-checkout":
      if (state.stage !== "initial") {
        return state;
      }
      return { stage: "sumup", topupAmount: action.topupAmount, checkoutId: action.checkoutId };
    case "sumup-success":
      if (state.stage !== "sumup") {
        return state;
      }
      return { stage: "success" };
    case "sumup-error":
      if (state.stage !== "sumup") {
        return state;
      }
      return { stage: "error", message: action.message };
    case "reset":
      return initialState;
  }
};

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Grid container justifyItems="center" justifyContent="center" sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        {children}
      </Grid>
    </Grid>
  );
};

type SumUpCardRespHandler = (type: SumUpResponseType, body: object) => void;
type SumUpCardLoadHandler = () => void;

export const TopUp: React.FC = () => {
  const { t, i18n } = useTranslation();

  const config = usePublicConfig();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();
  const [createCheckout] = useCreateCheckoutMutation();
  const [checkCheckout] = useCheckCheckoutMutation();

  const sumupCard = React.useRef<SumUpCardInstance | undefined>(undefined);
  const handleSumupCardResp = React.useRef<SumUpCardRespHandler | undefined>(undefined);
  const handleSumupCardLoad = React.useRef<SumUpCardLoadHandler | undefined>(undefined);

  const [state, dispatch] = React.useReducer(reducer, initialState);

  const reset = () => {
    dispatch({ type: "reset" });
  };

  React.useEffect(() => {
    handleSumupCardResp.current = (type: SumUpResponseType, body: object) => {
      console.log("handle sumup resp called");
      if (state.stage !== "sumup") {
        return;
      }
      console.log("Type", type);
      console.log("Body", body);
      if (type === "invalid" && "message" in body && typeof body.message === "string") {
        toast.error(body.message);
      }

      if (type === "error" || type === "success") {
        console.log("updating checkout");
        checkCheckout({ checkCheckoutPayload: { checkout_id: state.checkoutId } })
          .unwrap()
          .then((resp) => {
            console.log("update checkout returned with resp", resp);
            if (sumupCard.current) {
              sumupCard.current.unmount();
              sumupCard.current = undefined;
            }

            if (resp.status === "FAILED") {
              dispatch({ type: "sumup-error" });
            } else if (resp.status === "PAID") {
              dispatch({ type: "sumup-success" });
            }
            // TODO: retry somehow as the status is still pending
          })
          .catch(() => {
            // TODO: handle this
            toast.error("unexpected ");
          });
      }
    };

    handleSumupCardLoad.current = () => {
      console.log("sumup card loaded");
    };
  }, [checkCheckout, dispatch, state]);

  React.useEffect(() => {
    if (state.stage !== "sumup") {
      return;
    }
    console.log("checkoutId", state.checkoutId);
    const config = {
      id: "sumup-card",
      checkoutId: state.checkoutId,
      onLoad: handleSumupCardLoad.current,
      onResponse: handleSumupCardResp.current,
      locale: i18n.language,
    };
    if (sumupCard.current) {
      console.log("updating sumup card with config", config);
      sumupCard.current.update(config);
    } else {
      try {
        sumupCard.current = SumUpCard.mount(config);
        // sumupCard.current = SumUpCardMock.mount(config);
      } catch (e) {
        console.error("Mounting sumup card threw an error", e);
      }
    }
  }, [config, state, i18n, checkCheckout, dispatch]);

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
        console.log("created checkout with reference", checkout);
        dispatch({ type: "created-checkout", checkoutId: checkout.checkout_id, topupAmount: values.amount });
        setSubmitting(false);
      })
      .catch((error) => {
        console.error(error);
        setSubmitting(false);
      });
  };

  switch (state.stage) {
    case "initial":
      return (
        <Container>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            {t("topup.description")}
          </Alert>
          <Formik
            initialValues={initialValues}
            validationSchema={toFormikValidationSchema(TopUpSchema)}
            onSubmit={onSubmit}
          >
            {(formik) => (
              <Form onSubmit={formik.handleSubmit}>
                <Stack spacing={2}>
                  <FormCurrencyInput name="amount" label={t("topup.amount")} variant="outlined" formik={formik} />
                  {formik.isSubmitting && <LinearProgress />}
                  <Button type="submit" variant="contained" color="primary" disabled={formik.isSubmitting}>
                    {t("topup.next")}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </Container>
      );
    case "sumup":
      return (
        <Container>
          <div id="sumup-card"></div>
        </Container>
      );
    case "success":
      return (
        <Container>
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
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: "15em" }} />
          </Box>
        </Container>
      );
    case "error":
      return (
        <Container>
          <Alert severity="error" action={<Button onClick={reset}>{t("topup.tryAgain")}</Button>}>
            <AlertTitle>{t("error.title")}</AlertTitle>
            {t("error.message")}
            {/* <Trans i18nKey={"topup.error.message"}>An error occurred: {{ message: state.message }}, please</Trans> */}
          </Alert>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <CancelIcon color="error" sx={{ fontSize: "15em" }} />
          </Box>
        </Container>
      );
  }
};
