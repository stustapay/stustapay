import * as React from "react";
import { StepperForm, FormStep, FormTextField, FormNumericInput } from "@stustapay/form-components";
import { z } from "zod";
import { FormikProps } from "formik";
import { Container, InputAdornment, Stack, Typography } from "@mui/material";
import { useCreateEventMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import { SumUpSettings, SumUpSettingsSchema, SumupSettingsForm } from "./event-settings/TabSumUp";
import { useTranslation } from "react-i18next";
import { BonSettingsForm, BonSettings, BonSettingsSchema } from "./event-settings/TabBon";
import {
  CustomerPortalSettings,
  CustomerPortalSettingsForm,
  CustomerPortalSettingsSchema,
} from "./event-settings/TabCustomerPortal";
import { PayoutSettings, PayoutSettingsForm, PayoutSettingsSchema } from "./event-settings/TabPayout";
import { CurrencyIdentifierSchema, getCurrencySymbolForIdentifier } from "@stustapay/models";
import { CurrencyIdentifierSelect } from "@/components/features";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { withPrivilegeGuard } from "@/app/layout";

const GeneralFormSchema = z.object({
  name: z.string(),
  description: z
    .string()
    .optional()
    .transform((val) => val ?? ""),
  currency_identifier: CurrencyIdentifierSchema,
  max_account_balance: z.number(),
  ust_id: z.string(),
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

const GeneralForm: React.FC<FormikProps<GeneralFormValues>> = (formik) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <FormTextField name="name" label={t("settings.general.name")} formik={formik} />
      <FormTextField name="description" label={t("settings.general.description")} formik={formik} />
      <CurrencyIdentifierSelect
        label={t("settings.general.currency_identifier")}
        value={formik.values.currency_identifier}
        onChange={(val) => formik.setFieldValue("currency_identifier", val)}
        error={formik.touched.currency_identifier && !!formik.errors.currency_identifier}
        helperText={(formik.touched.currency_identifier && formik.errors.currency_identifier) as string}
      />
      <FormNumericInput
        label={t("settings.general.max_account_balance")}
        name="max_account_balance"
        formik={formik}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {getCurrencySymbolForIdentifier(formik.values.currency_identifier)}
            </InputAdornment>
          ),
        }}
      />
      <FormTextField label={t("settings.general.ust_id")} name="ust_id" formik={formik} />
    </Stack>
  );
};

const generalFormStep: FormStep = {
  title: "General",
  initialValues: {
    name: "",
    description: "",
    currency_identifier: "EUR",
    max_account_balance: null as unknown as number,
    ust_id: "",
  },
  schema: GeneralFormSchema,
  form: GeneralForm,
};

const sumupFormStep: FormStep = {
  title: "SumUp",
  initialValues: {
    sumup_affiliate_key: "",
    sumup_api_key: "",
    sumup_merchant_code: "",
    sumup_payment_enabled: false,
    sumup_topup_enabled: false,
  },
  schema: SumUpSettingsSchema,
  form: SumupSettingsForm,
};

const payoutFormStep: FormStep = {
  title: "Payout",
  initialValues: {
    sepa_allowed_country_codes: [],
    sepa_description: "",
    sepa_enabled: false,
    sepa_sender_iban: "",
    sepa_sender_name: "",
  },
  schema: PayoutSettingsSchema,
  form: PayoutSettingsForm,
};

const bonFormStep: FormStep = {
  title: "Bon",
  initialValues: {
    bon_issuer: "",
    bon_address: "",
    bon_title: "",
  },
  schema: BonSettingsSchema,
  form: BonSettingsForm,
};

const customerPortalFormStep: FormStep = {
  title: "Customer Portal",
  initialValues: {
    customer_portal_contact_email: "",
    customer_portal_url: "",
    customer_portal_about_page_url: "",
    customer_portal_data_privacy_url: "",
  },
  schema: CustomerPortalSettingsSchema,
  form: CustomerPortalSettingsForm,
};

const steps = [generalFormStep, customerPortalFormStep, sumupFormStep, bonFormStep, payoutFormStep] as const;

type FormValues = GeneralFormValues & SumUpSettings & BonSettings & CustomerPortalSettings & PayoutSettings;

export const EventCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const [createEvent] = useCreateEventMutation();
  const handleSubmit = async (values: FormValues) => {
    try {
      const newNode = await createEvent({ nodeId: currentNode.id, newEvent: values }).unwrap();
      navigate(`/node/${newNode.id}/settings`);
    } catch (e) {
      toast.error(`Error creating event: ${e}`);
    }
  };

  return (
    <Container maxWidth="md">
      <Stack spacing={2}>
        <Typography variant="h4" textAlign="center">
          {t("settings.createEvent.heading", { parentNodeName: currentNode.name })}
        </Typography>
        <StepperForm steps={steps} onSubmit={handleSubmit} />
      </Stack>
    </Container>
  );
});
