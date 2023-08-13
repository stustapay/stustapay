import { MarkdownEditor } from "@components";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, FormControl, FormLabel, Stack, Tab, TextField } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

const TabMail: React.FC = () => {
  const [mail, setMail] = React.useState("");

  return <MarkdownEditor label="Email Template" value={mail} onChange={setMail} showPreview={true} />;
};

const TabCustomerPortal: React.FC = () => {
  return (
    <Stack spacing={2}>
      <TextField label="Contact E-Mail" />
    </Stack>
  );
};

const TabGeneral: React.FC = () => {
  return (
    <Stack spacing={2}>
      <TextField label="Currency Symbol" value="€" />
      <TextField label="Currency Identifier" value="EUR" />
      <TextField label="Max account balance" value="100€" />
      <TextField label="UST ID" value="Foobar" />
    </Stack>
  );
};

const TabPayment: React.FC = () => {
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

const TabBon: React.FC = () => {
  return (
    <Stack spacing={2}>
      <TextField label="Title" value="StuStaCulumn" />
      <TextField label="Issuer" value="VKL" />
      <TextField label="Address" value="Musterstraße 6" />
    </Stack>
  );
};

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("general");

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
          <TabGeneral />
        </TabPanel>
        <TabPanel value="customerPortal">
          <TabCustomerPortal />
        </TabPanel>
        <TabPanel value="payment">
          <TabPayment />
        </TabPanel>
        <TabPanel value="bon">
          <TabBon />
        </TabPanel>
        <TabPanel value="email">
          <TabMail />
        </TabPanel>
      </Box>
    </TabContext>
  );
};
