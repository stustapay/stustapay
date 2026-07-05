import { ConfirmationNumber as ConfirmationNumberIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { ExternalTicketRoutes, TicketRoutes } from "@/app/routes";

const getActiveTab = (location: string) => {
  if (location.startsWith(ExternalTicketRoutes.list())) {
    return ExternalTicketRoutes.list();
  }
  return TicketRoutes.list();
};

export const TicketPageLayout: React.FC = withTreeObjectGuard("ticket", () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Box>
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab
          label={t("tickets")}
          component={RouterLink}
          icon={<ConfirmationNumberIcon />}
          iconPosition="start"
          value={TicketRoutes.list()}
          to={TicketRoutes.list()}
        />
        <Tab
          label={t("externalTicket.presaleTickets")}
          component={RouterLink}
          icon={<ConfirmationNumberIcon />}
          value={ExternalTicketRoutes.list()}
          to={ExternalTicketRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
