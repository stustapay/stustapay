import {
  Smartphone as SmartphoneIcon,
  PhonelinkSetup as PhonelinkSetupIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";

import { useNode } from "@/api/nodes";
import { TerminalMdmRoutes, TerminalRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const TerminalPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });

  const tabs = React.useMemo(
    () => [
      {
        value: TerminalRoutes.list(),
        label: t("terminal.overview"),
        to: TerminalRoutes.list(),
        icon: <MapIcon />,
      },
      {
        value: TerminalRoutes.action("list"),
        label: t("terminal.terminals"),
        to: TerminalRoutes.action("list"),
        icon: <SmartphoneIcon />,
      },
      {
        value: TerminalMdmRoutes.list(),
        label: t("terminal.mdmDevices"),
        to: TerminalMdmRoutes.list(),
        icon: <PhonelinkSetupIcon />,
      },
    ],
    [t]
  );

  if (!nodeId) {
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} ariaLabel="Terminals" />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
