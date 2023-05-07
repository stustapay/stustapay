import { useGetCustomerQuery, useGetDataPrivacyUrlQuery, useSetCustomerInfoMutation } from "@/api/customerApi";
import { Loading } from "@stustapay/components";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { CustomerInfoSchema, CustomerInfo } from "@stustapay/models";
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { z } from "zod";
import iban from "iban";

const FormSchema = z.object({
  iban: z.string().refine((val) => iban.isValid(val), {
    message: "IBAN is not valid",
  }),
  account_name: z.string(),
  email: z.string().email(),
  privacy_policy: z.boolean().refine((val) => val, { message: "You must accept the privacy policy" }),
});

type FormVal = z.infer<typeof FormSchema>;

export const PayoutInfo: React.FC = () => {
  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const { data: dataPrivacyUrl, error: errorPrivacyUrl, isLoading: isLoadingPrivacyUrl } = useGetDataPrivacyUrlQuery();

  const [setCustomerInfo] = useSetCustomerInfoMutation();

  const { t } = useTranslation(["common"]);

  const navigate = useNavigate();

  if (
    isCustomerLoading ||
    (!customer && !customerError) ||
    isLoadingPrivacyUrl ||
    (!dataPrivacyUrl && !errorPrivacyUrl)
  ) {
    return <Loading />;
  }

  if (customerError || !customer || errorPrivacyUrl || !dataPrivacyUrl) {
    toast.error(t("Error fetching data."));
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
        toast.success(t("Successfully updated bank data."));
        navigate(-1);
      })
      .catch((error) => {
        toast.error(t("Error occurred while updating bank data."));
        console.error(error);
      });

    console.log(values);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "2rem auto",
        maxWidth: "800px",
        width: "90%",
      }}
    >
      <Alert severity="info" variant="outlined" style={{ marginBottom: "2em", width: "100%" }}>
        Enter your account information to receive your leftover cash to your bank account.
      </Alert>
      <Formik initialValues={initialValues} validationSchema={toFormikValidationSchema(FormSchema)} onSubmit={onSubmit}>
        {(formik) => (
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
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
              </Grid>
              <Grid item xs={12}>
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
              </Grid>
              <Grid item xs={12}>
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
              </Grid>
              <Grid item xs={12}>
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
                      <>
                        I have read and agree to StuStaCulum's&nbsp;
                        <Link href={dataPrivacyUrl} target="_blank" rel="noopener">
                          privacy policy
                        </Link>
                        .
                      </>
                    }
                  />
                  {formik.touched.privacy_policy && (
                    <FormHelperText sx={{ ml: 0 }}>{formik.errors.privacy_policy}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary" disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? "Submitting" : "Submit"}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </div>
  );
};
