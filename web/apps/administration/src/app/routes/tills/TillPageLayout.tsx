import { useNode } from "@/api/nodes";
import {
  TillButtonsRoutes,
  TillLayoutRoutes,
  TillProfileRoutes,
  CashRegistersRoutes,
  TillRoutes,
  TillStockingsRoutes,
} from "@/app/routes";
import { Folder as FolderIcon, Gamepad as GamepadIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link as RouterLink, useLocation, useParams } from "react-router-dom";

const getActiveTab = (location: string) => {
  if (location.startsWith(TillProfileRoutes.list())) {
    return TillProfileRoutes.list();
  }
  if (location.startsWith(TillLayoutRoutes.list())) {
    return TillLayoutRoutes.list();
  }
  if (location.startsWith(TillButtonsRoutes.list())) {
    return TillButtonsRoutes.list();
  }
  if (location.startsWith(CashRegistersRoutes.list())) {
    return CashRegistersRoutes.list();
  }
  if (location.startsWith(TillStockingsRoutes.list())) {
    return TillStockingsRoutes.list();
  }
  return TillRoutes.list();
};

export const TillPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });
  const location = useLocation();

  if (!nodeId) {
    // TODO: return error page / redirect
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box>
      <Tabs value={getActiveTab(location.pathname)} sx={{ borderBottom: 1, borderColor: "divider" }} aria-label="Tills">
        <Tab
          label={t("till.tills")}
          component={RouterLink}
          icon={<PointOfSaleIcon />}
          iconPosition="start"
          value={TillRoutes.list()}
          to={TillRoutes.list()}
        />
        <Tab
          label={t("profile.profiles")}
          component={RouterLink}
          icon={<FolderIcon />}
          iconPosition="start"
          value={TillProfileRoutes.list()}
          to={TillProfileRoutes.list()}
        />
        <Tab
          label={t("layout.layouts")}
          component={RouterLink}
          icon={<FolderIcon />}
          iconPosition="start"
          value={TillLayoutRoutes.list()}
          to={TillLayoutRoutes.list()}
        />
        <Tab
          label={t("button.buttons")}
          component={RouterLink}
          icon={<GamepadIcon />}
          iconPosition="start"
          value={TillButtonsRoutes.list()}
          to={TillButtonsRoutes.list()}
        />
        <Tab
          label={t("register.registers")}
          component={RouterLink}
          value={CashRegistersRoutes.list()}
          to={CashRegistersRoutes.list()}
        />
        <Tab
          label={t("register.stockings")}
          component={RouterLink}
          value={TillStockingsRoutes.list()}
          to={TillStockingsRoutes.list()}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
