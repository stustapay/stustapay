import { useGetCustomerQuery, useGetDataPrivacyUrlQuery, useSetCustomerInfoMutation } from "@/api/customerApi";
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

const FormSchema = z.object({
  iban: z.string().refine((val) => iban.isValid(val), {
    message: i18n.t("payout.ibanNotValid"),
  }),
  account_name: z.string(),
  email: z.string().email(),
  privacy_policy: z.boolean().refine((val) => val, {
    message: i18n.t("payout.mustAcceptPrivacyPolicy"),
  }),
});

type FormVal = z.infer<typeof FormSchema>;

export const PayoutInfo: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "payout" });
  const navigate = useNavigate();

  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();
  const { data: dataPrivacyUrl, error: errorPrivacyUrl, isLoading: isLoadingPrivacyUrl } = useGetDataPrivacyUrlQuery();

  const [setCustomerInfo] = useSetCustomerInfoMutation();

  if (
    isCustomerLoading ||
    (!customer && !customerError) ||
    isLoadingPrivacyUrl ||
    (!dataPrivacyUrl && !errorPrivacyUrl)
  ) {
    return <Loading />;
  }

  if (customerError || !customer || errorPrivacyUrl || !dataPrivacyUrl) {
    toast.error(t("errorFetchingData"));
    navigate(-1);
    return null;
  }

  const initialValues: FormVal = {
    iban: customer.iban ?? "",
    account_name: customer.account_name ?? "",
    email: customer.email ?? "",
    privacy_policy: false,
  };

  const onSubmit = (values: FormVal, { setSubmitting }: FormikHelpers<FormVal>) => {
    setSubmitting(true);
    // Form data to the API server
    setCustomerInfo(values)
      .unwrap()
      .then(() => {
        toast.success(t("updatedBankData"));
        navigate(-1);
      })
      .catch((error) => {
        toast.error(t("errorWhileUpdatingBankData"));
        console.error(error);
      });

    console.log(values);
    setSubmitting(false);
  };

  return (
    <Grid container justifyItems="center" justifyContent="center">
      <Grid item xs={8}>
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
                <TextField
                  id="iban"
                  name="iban"
                  label="IBAN"
                  variant="outlined"
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
                  label="Account Name"
                  variant="outlined"
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
                  label="Email"
                  variant="outlined"
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
                      <Trans i18nKey="payout.privayPolicyCheck">
                        please accept the
                        <Link href={dataPrivacyUrl} target="_blank" rel="noopener">
                          privacy policy
                        </Link>
                      </Trans>
                    }
                  />
                  {formik.touched.privacy_policy && (
                    <FormHelperText sx={{ ml: 0 }}>{formik.errors.privacy_policy}</FormHelperText>
                  )}
                </FormControl>
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
