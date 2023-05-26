
import { useGetCustomerQuery, useSetCustomerInfoMutation } from "@/api/customerApi";
import { Loading } from "@stustapay/components";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  Link,
  Stack,
  TextField,
} from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { z } from "zod";
import iban from "iban";
import i18n from "@/i18n";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useSetAmountMutation } from "@/api/topupApi";

// TODO: 
// Change textfield to numeric field
// change mutation to querry as the amount the checkout id is returned
// forward to checkout, use the checkout id

const FormSchema = z.number()
type FormVal = z.infer<typeof FormSchema>;


export const PayoutInfo: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "payout" });
  const navigate = useNavigate();

  const config = usePublicConfig();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  // update mutation
  //   const [setCustomerInfo] = useSetCustomerInfoMutation();
  const [setAmount] = useSetAmountMutation();

  if (isCustomerLoading || (!customer && !customerError)) {
    return <Loading />;
  }

  if (customerError || !customer) {
    toast.error(t("errorFetchingData"));
    navigate(-1);
    return null;
  }

  const initialValues: FormVal = 0

  const onSubmit = (values: FormVal, { setSubmitting }: FormikHelpers<FormVal>) => {
    setSubmitting(true);
    // Form data to the API server
    setAmount(values)
      .unwrap()
      .then(() => {
        // forward to next checkout page
      })
      .catch((error) => {
        toast.error(t("errorWhileUpdatingBankData"));
        console.error(error);
      });

    console.log(values);
    setSubmitting(false);
  };

  return (
    <Grid container justifyItems="center" justifyContent="center" sx={{ paddingX: 0.5 }}>
      <Grid item xs={12} sm={8} sx={{ mt: 2 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t("info")}
        </Alert>
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(FormSchema)}
          onSubmit={onSubmit}
        >
          {(formik) => (
            <form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                {/* lookup how to do number field */}
                <TextField
                  id="amount"
                  name="amount"
                  label="Amount"
                  variant="outlined"
                  fullWidth
                  value={formik.values}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.amount && Boolean(formik.errors.amount)}
                  helperText={formik.touched.amount && formik.errors.amount}
                />
                <Button type="submit" variant="contained" color="primary" disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? "Submitting" : "Submit"}
                </Button>
              </Stack>
            </form>
          )}
        </Formik>
      </Grid>
    </Grid>
  );
};