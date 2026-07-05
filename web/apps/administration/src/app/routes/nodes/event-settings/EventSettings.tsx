import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, Stack, Tab } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { useQueryVar } from "@stustapay/utils";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";

import { useArchiveNodeMutation, useGetRestrictedEventSettingsQuery } from "@/api";
import { ResponsiveTabSelect } from "@/components";
import { useCurrentNode } from "@/hooks";

import { NodeConfiguration } from "../node-settings";
import { TabAgb } from "./TabAgb";
import { TabBon } from "./TabBon";
import { TabCustomerPortal } from "./TabCustomerPortal";
import { TabDesign } from "./TabDesign";
import { TabFaq } from "./TabFaq";
import { TabGeneral } from "./TabGeneral";
import { TabMail } from "./TabMail";
import { TabMdm } from "./TabMdm";
import { TabPayout } from "./TabPayout";
import { TabPretix } from "./TabPretix";
import { TabPrivacyPolicy } from "./TabPrivacyPolicy";
import { TabSumUp } from "./TabSumUp";

export const EventSettings: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [activeTab, setActiveTab] = useQueryVar("tab", "node");
  const { currentNode } = useCurrentNode();
  const { data: eventSettings, isLoading, error } = useGetRestrictedEventSettingsQuery({ nodeId: currentNode.id });
  const [archiveNode] = useArchiveNodeMutation();
  const openModal = useOpenModal();

  const tabOptions = React.useMemo(
    () => [
      { value: "node", label: t("common.node") },
      { value: "general", label: t("settings.general.tabLabel") },
      { value: "customerPortal", label: t("settings.customerPortal.tabLabel") },
      { value: "design", label: t("settings.design.tabLabel") },
      { value: "pretix", label: t("settings.pretix.tabLabel") },
      { value: "agb", label: t("settings.agb.tabLabel") },
      { value: "privacypolicy", label: t("settings.privacypolicy.tabLabel") },
      { value: "faq", label: t("settings.faq.tabLabel") },
      { value: "sumup", label: t("settings.sumup.tabLabel") },
      { value: "payout", label: t("settings.payout.tabLabel") },
      { value: "bon", label: t("settings.bon.tabLabel") },
      { value: "email", label: t("settings.email.tabLabel") },
      { value: "mdm", label: t("settings.mdm.tabLabel") },
    ],
    [t]
  );

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

  const handleArchiveNode = () => {
    openModal({
      type: "confirm",
      title: t("settings.archiveNode.confirmTitle"),
      content: t("settings.archiveNode.confirmContent", { nodeName: currentNode.name }),
      onConfirm: () => {
        archiveNode({ nodeId: currentNode.id })
          .unwrap()
          .then(() => {
            toast.success(t("settings.archiveNode.success"));
          })
          .catch(() => {
            toast.error(t("settings.archiveNode.error"));
          });
      },
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ display: "flex", justifyContent: "center", spacing: 2 }}>
        <Button variant="outlined" component={RouterLink} to={`/node/${currentNode.id}/create-node`}>
          {t("settings.createNode.link")}
        </Button>
        <Button variant="outlined" color="error" onClick={handleArchiveNode}>
          {t("settings.archiveNode.button")}
        </Button>
      </Stack>
      <TabContext value={activeTab}>
        {!isDesktop && (
          <ResponsiveTabSelect value={activeTab} options={tabOptions} onChange={setActiveTab} sx={{ mb: 0 }} />
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: isDesktop ? "min-content auto" : "1fr" }}>
          {isDesktop && (
            <Box sx={{ borderRight: 1, borderColor: "divider" }}>
              <TabList onChange={(_, tab) => setActiveTab(tab)} orientation="vertical">
                {tabOptions.map((tab) => (
                  <Tab key={tab.value} label={tab.label} value={tab.value} />
                ))}
              </TabList>
            </Box>
          )}
          <TabPanel value="node">
            <NodeConfiguration />
          </TabPanel>
          <TabPanel value="general">
            <TabGeneral nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="design">
            <TabDesign nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="customerPortal">
            <TabCustomerPortal nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="pretix">
            <TabPretix nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="agb">
            <TabAgb nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="privacypolicy">
            <TabPrivacyPolicy nodeId={currentNode.id} eventSettings={eventSettings} />
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
            <TabMail nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
          <TabPanel value="mdm">
            <TabMdm nodeId={currentNode.id} eventSettings={eventSettings} />
          </TabPanel>
        </Box>
      </TabContext>
    </Stack>
  );
};
