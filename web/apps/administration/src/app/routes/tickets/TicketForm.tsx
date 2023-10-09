import { NewTicket } from "@/api";
import { ProductSelect, RestrictionSelect } from "@/components/features";
import { useCurrencySymbol } from "@/hooks";
import { InputAdornment } from "@mui/material";
import { FormNumericInput, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TicketFormProps<T extends NewTicket> = FormikProps<T>;

export function TicketForm<T extends NewTicket>(props: TicketFormProps<T>) {
  const { values, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol();

  return (
    <>
      <FormTextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("ticket.name")}
        formik={props}
      />

      <FormTextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("ticket.description")}
        formik={props}
      />

      <FormNumericInput
        variant="standard"
        margin="normal"
        fullWidth
        name="price"
        label={t("ticket.initialTopUpAmount")}
        InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
        formik={props}
      />

      <ProductSelect
        label={t("ticket.product")}
        margin="normal"
        variant="standard"
        value={values.product_id}
        onChange={(value) => setFieldValue("product_id", value)}
        error={touched.product_id && !!errors.product_id}
        helperText={(touched.product_id && errors.product_id) as string}
      />

      <RestrictionSelect
        label={t("ticket.restriction")}
        margin="normal"
        variant="standard"
        value={(values.restriction == null ? null : [values.restriction]) as any} // TODO: proper typing
        multiple={false}
        onChange={(value) => setFieldValue("restriction", value.length > 0 ? value[0] : null)}
        error={touched.restriction && !!errors.restriction}
        helperText={(touched.restriction && errors.restriction) as string}
      />
    </>
  );
}
