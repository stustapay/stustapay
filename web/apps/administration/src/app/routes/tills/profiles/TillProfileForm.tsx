import { NewTillProfile } from "@/api";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { TillLayout, selectTillLayoutAll, useListTillLayoutsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";

export type TillProfileFormProps<T extends NewTillProfile> = FormikProps<T>;

export function TillProfileForm<T extends NewTillProfile>(props: TillProfileFormProps<T>) {
  const { values, handleChange, touched, errors, setFieldValue } = props;
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { layouts } = useListTillLayoutsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        layouts: data ? selectTillLayoutAll(data) : [],
      }),
    }
  );
  return (
    <>
      <FormTextField autoFocus name="name" label={t("profile.name")} formik={props} />
      <FormTextField name="description" label={t("profile.description")} formik={props} />

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_top_up" checked={values.allow_top_up} onChange={handleChange} />}
          label={t("profile.allowTopUp")}
        />
      </FormGroup>

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_cash_out" checked={values.allow_cash_out} onChange={handleChange} />}
          label={t("profile.allowCashOut")}
        />
      </FormGroup>

      <FormGroup>
        <FormControlLabel
          control={<Checkbox name="allow_ticket_sale" checked={values.allow_ticket_sale} onChange={handleChange} />}
          label={t("profile.allowTicketSale")}
        />
      </FormGroup>

      <Select
        label={t("layout.layout")}
        multiple={false}
        value={layouts.find((l) => l.id === values.layout_id) ?? null}
        formatOption={(layout: TillLayout) => layout.name}
        options={layouts}
        error={touched.layout_id && !!errors.layout_id}
        helperText={(touched.layout_id && errors.layout_id) as string}
        onChange={(value: TillLayout | null) => (value != null ? setFieldValue("layout_id", value.id) : undefined)}
      />
    </>
  );
}
