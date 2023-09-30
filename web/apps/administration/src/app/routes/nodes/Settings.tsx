import { Event } from "@/api";
import { MarkdownEditor } from "@components";
import { useCurrentEvent } from "@hooks";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, FormControl, FormLabel, Stack, Tab, TextField } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

const TabMail: React.FC = () => {
  const [mail, setMail] = React.useState("");

  return <MarkdownEditor label="Email Template" value={mail} onChange={setMail} showPreview={true} />;
};

const TabCustomerPortal: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Stack spacing={2}>
      <TextField label="Contact E-Mail" value={event.customer_portal_contact_email} />
    </Stack>
  );
};

const TabGeneral: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Stack spacing={2}>
      <TextField label="Currency Identifier" value={event.currency_identifier} />
      <TextField label="Max account balance" value={event.max_account_balance} />
      <TextField label="UST ID" value={event.ust_id} />
    </Stack>
  );
};

const TabPayment: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Stack spacing={2}>
      <FormControl component="fieldset" variant="standard">
        <FormLabel component="legend">SumUp Settings</FormLabel>
        <Stack spacing={2}>
          <TextField label="SumUp API Key" value="" />
        </Stack>
      </FormControl>
      <FormControl component="fieldset" variant="standard">
        <FormLabel component="legend">Payout Settings</FormLabel>
        <Stack spacing={2}>
          <TextField label="Sepa Sender Name" />
          <TextField label="Sepa Sender IBAN" />
          <TextField label="Sepa Description" />
          <TextField label="Sepa Allowed Countries" />
        </Stack>
      </FormControl>
    </Stack>
  );
};

const TabBon: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Stack spacing={2}>
      <TextField label="Title" value={event.bon_title} />
      <TextField label="Issuer" value={event.bon_issuer} />
      <TextField label="Address" value={event.bon_address} />
    </Stack>
  );
};

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("general");
  const { event } = useCurrentEvent();

  return (
    <TabContext value={activeTab}>
      <Box display="grid" gridTemplateColumns="min-content auto">
        <Box sx={{ borderRight: 1, borderColor: "divider" }}>
          <TabList onChange={(_, tab) => setActiveTab(tab)} orientation="vertical">
            <Tab label={t("settings.general")} value="general" />
            <Tab label={t("settings.customerPortal")} value="customerPortal" />
            <Tab label={t("settings.payment")} value="payment" />
            <Tab label={t("settings.bon")} value="bon" />
            <Tab label={t("settings.email")} value="email" />
          </TabList>
        </Box>
        <TabPanel value="general">
          <TabGeneral event={event} />
        </TabPanel>
        <TabPanel value="customerPortal">
          <TabCustomerPortal event={event} />
        </TabPanel>
        <TabPanel value="payment">
          <TabPayment event={event} />
        </TabPanel>
        <TabPanel value="bon">
          <TabBon event={event} />
        </TabPanel>
        <TabPanel value="email">
          <TabMail />
        </TabPanel>
      </Box>
    </TabContext>
  );
};
