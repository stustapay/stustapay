import { ConfirmationNumber as ConfirmationNumberIcon } from "@mui/icons-material";
import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { ExternalTicketRoutes, TicketRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const TicketPageLayout: React.FC = withTreeObjectGuard("ticket", () => {
  const { t } = useTranslation();

  const tabs = React.useMemo(
    () => [
      {
        value: TicketRoutes.list(),
        label: t("tickets"),
        to: TicketRoutes.list(),
        icon: <ConfirmationNumberIcon />,
      },
      {
        value: ExternalTicketRoutes.list(),
        label: t("externalTicket.presaleTickets"),
        to: ExternalTicketRoutes.list(),
        icon: <ConfirmationNumberIcon />,
      },
    ],
    [t]
  );

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
