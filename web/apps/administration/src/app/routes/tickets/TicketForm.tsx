import { NewTicket } from "@/api";
import { ProductSelect, RestrictionSelect } from "@/components/features";
import { useCurrencySymbol } from "@/hooks";
import { InputAdornment, TextField } from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

export type TicketFormProps<T extends NewTicket> = FormikProps<T>;

export function TicketForm<T extends NewTicket>({
  handleBlur,
  handleChange,
  values,
  touched,
  errors,
  setFieldValue,
}: TicketFormProps<T>) {
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol();

  return (
    <>
      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        autoFocus
        name="name"
        label={t("ticket.name")}
        error={touched.name && !!errors.name}
        helperText={(touched.name && errors.name) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />

      <TextField
        variant="standard"
        margin="normal"
        fullWidth
        name="description"
        label={t("ticket.description")}
        error={touched.description && !!errors.description}
        helperText={(touched.description && errors.description) as string}
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.description}
      />

      <NumericInput
        variant="standard"
        margin="normal"
        fullWidth
        name="price"
        label={t("ticket.initialTopUpAmount")}
        InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
        error={touched.initial_top_up_amount && !!errors.initial_top_up_amount}
        helperText={(touched.initial_top_up_amount && errors.initial_top_up_amount) as string}
        onChange={(value) => setFieldValue("initial_top_up_amount", value)}
        value={values.initial_top_up_amount}
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
