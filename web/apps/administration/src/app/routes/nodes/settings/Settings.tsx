import { useGetRestrictedEventSettingsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert, AlertTitle, Box, Tab } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useQueryVar } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TabAgb } from "./TabAgb";
import { TabBon } from "./TabBon";
import { TabCustomerPortal } from "./TabCustomerPortal";
import { TabFaq } from "./TabFaq";
import { TabGeneral } from "./TabGeneral";
import { TabMail } from "./TabMail";
import { TabPayout } from "./TabPayout";
import { TabSumUp } from "./TabSumUp";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useQueryVar("tab", "general");
  const { currentNode } = useCurrentNode();
  const { data: eventSettings, isLoading, error } = useGetRestrictedEventSettingsQuery({ nodeId: currentNode.id });

  if (isLoading || (!eventSettings && !error)) {
    return <Loading />;
  }

  if (!eventSettings || error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error loading event settings</AlertTitle>
      </Alert>
    );
  }

  return (
    <TabContext value={activeTab}>
      <Box display="grid" gridTemplateColumns="min-content auto">
        <Box sx={{ borderRight: 1, borderColor: "divider" }}>
          <TabList onChange={(_, tab) => setActiveTab(tab)} orientation="vertical">
            <Tab label={t("settings.general.tabLabel")} value="general" />
            <Tab label={t("settings.customerPortal.tabLabel")} value="customerPortal" />
            <Tab label={t("settings.agb.tabLabel")} value="agb" />
            <Tab label={t("settings.faq.tabLabel")} value="faq" />
            <Tab label={t("settings.sumup.tabLabel")} value="sumup" />
            <Tab label={t("settings.payout.tabLabel")} value="payout" />
            <Tab label={t("settings.bon.tabLabel")} value="bon" />
            <Tab label={t("settings.email.tabLabel")} value="email" />
          </TabList>
        </Box>
        <TabPanel value="general">
          <TabGeneral nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="customerPortal">
          <TabCustomerPortal nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="agb">
          <TabAgb nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="faq">
          <TabFaq nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="sumup">
          <TabSumUp nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="payout">
          <TabPayout nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="bon">
          <TabBon nodeId={currentNode.id} eventSettings={eventSettings} />
        </TabPanel>
        <TabPanel value="email">
          <TabMail />
        </TabPanel>
      </Box>
    </TabContext>
  );
};
