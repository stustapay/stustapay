import { useNode } from "@/api/nodes";
import { TerminalMdmRoutes, TerminalRoutes } from "@/app/routes";
import {
  Smartphone as SmartphoneIcon,
  PhonelinkSetup as PhonelinkSetupIcon,
} from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(TerminalMdmRoutes.list())) {
    return TerminalMdmRoutes.list();
  }
  return TerminalRoutes.list();
};

export const TerminalPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });
  const location = useLocation();

  if (!nodeId) {
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box>
      <Tabs
        value={getActiveTab(location.pathname)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
        aria-label="Terminals"
      >
        <Tab
          label={t("terminal.terminals")}
          component={RouterLink}
          icon={<SmartphoneIcon />}
          iconPosition="start"
          value={TerminalRoutes.list()}
          to={TerminalRoutes.list()}
        />
        <Tab
          label={t("terminal.mdmDevices")}
          component={RouterLink}
          icon={<PhonelinkSetupIcon />}
          iconPosition="start"
          value={TerminalMdmRoutes.list()}
          to={TerminalMdmRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
