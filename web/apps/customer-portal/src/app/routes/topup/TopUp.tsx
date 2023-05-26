import * as React from "react";
import { useGetCustomerQuery } from "@/api/customerApi";
import { Loading, NumericInput } from "@stustapay/components";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Grid, InputAdornment, Stack } from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { z } from "zod";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useCreateCheckoutMutation } from "@/api/topupApi";

const FormSchema = z.object({ amount: z.number() });

type FormVal = z.infer<typeof FormSchema>;

const initialValues: FormVal = { amount: 0 };

declare global {
  interface SumUpCard {
    mount: (config: any) => void;
  }
}

export const TopUp: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "topup" });
  const navigate = useNavigate();

  const config = usePublicConfig();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const [createCheckout] = useCreateCheckoutMutation();
  const [checkoutId, setCheckoutId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!checkoutId) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const card = SumUpCard.mount({
        id: "sumup-card",
        checkoutId: checkoutId,
        currency: config.currency_identifier,
        showAmount: 0,
        onResponse: (type: any, body: any) => {
          console.log("Type", type);
          console.log("Body", body);
        },
        onError: (foo: any) => {
          console.error("sumup on erron", foo);
        },
      });
    } catch (e) {
      console.error("sumup error", e);
    }
  }, [config, checkoutId]);

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    // toast.error(t("errorFetchingData"));
    navigate(-1);
    return null;
  }

  const onSubmit = (values: FormVal, { setSubmitting }: FormikHelpers<FormVal>) => {
    setSubmitting(true);
    createCheckout(values)
      .unwrap()
      .then((checkout) => {
        setCheckoutId(checkout.id);
        setSubmitting(false);
      })
      .catch((error) => {
        toast.error(t("errorWhileCreatingCheckout"));
        console.error(error);
        setSubmitting(false);
      });
  };

  return (
    <Grid container justifyItems="center" justifyContent="center" sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t("info")}
        </Alert>
        {checkoutId ? (
          <div id="sumup-card"></div>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={toFormikValidationSchema(FormSchema)}
            onSubmit={onSubmit}
          >
            {({ handleSubmit, values, setFieldValue, touched, errors, isSubmitting }) => (
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {/* lookup how to do number field */}
                  <NumericInput
                    name="amount"
                    label={t("amount")}
                    variant="outlined"
                    fullWidth
                    value={values.amount}
                    onChange={(val) => setFieldValue("amount", val)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">{config.currency_symbol}</InputAdornment>,
                    }}
                    error={touched.amount && Boolean(errors.amount)}
                    helperText={(touched.amount && errors.amount) as string}
                  />
                  <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting" : "Submit"}
                  </Button>
                </Stack>
              </form>
            )}
          </Formik>
        )}
      </Grid>
    </Grid>
  );
};
