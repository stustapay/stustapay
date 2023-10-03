import { useCurrentEvent, useCurrentNode } from "@/hooks";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TabBon } from "./TabBon";
import { TabCustomerPortal } from "./TabCustomerPortal";
import { TabGeneral } from "./TabGeneral";
import { TabMail } from "./TabMail";
import { TabPayment } from "./TabPayment";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("general");
  const { currentNode } = useCurrentNode();
  // TODO: remove the following line
  const { event } = useCurrentEvent();

  return (
    <TabContext value={activeTab}>
      <Box display="grid" gridTemplateColumns="min-content auto">
        <Box sx={{ borderRight: 1, borderColor: "divider" }}>
          <TabList onChange={(_, tab) => setActiveTab(tab)} orientation="vertical">
            <Tab label={t("settings.general.tabLabel")} value="general" />
            <Tab label={t("settings.customerPortal.tabLabel")} value="customerPortal" />
            <Tab label={t("settings.payment.tabLabel")} value="payment" />
            <Tab label={t("settings.bon.tabLabel")} value="bon" />
            <Tab label={t("settings.email.tabLabel")} value="email" />
          </TabList>
        </Box>
        <TabPanel value="general">
          <TabGeneral nodeId={currentNode.id} event={event} />
        </TabPanel>
        <TabPanel value="customerPortal">
          <TabCustomerPortal nodeId={currentNode.id} event={event} />
        </TabPanel>
        <TabPanel value="payment">
          <TabPayment nodeId={currentNode.id} event={event} />
        </TabPanel>
        <TabPanel value="bon">
          <TabBon nodeId={currentNode.id} event={event} />
        </TabPanel>
        <TabPanel value="email">
          <TabMail />
        </TabPanel>
      </Box>
    </TabContext>
  );
};
