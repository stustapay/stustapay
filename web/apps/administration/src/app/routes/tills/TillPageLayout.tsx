import {
  Folder as FolderIcon,
  Gamepad as GamepadIcon,
  Map as MapIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import {
  TillButtonsRoutes,
  TillLayoutRoutes,
  TillProfileRoutes,
  CashRegistersRoutes,
  TillRoutes,
  TillStockingsRoutes,
} from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const TillPageLayout: React.FC = withTreeObjectGuard("till", () => {
  const { t } = useTranslation();

  const tabs = React.useMemo(
    () => [
      {
        value: TillRoutes.list(),
        label: t("till.overview"),
        to: TillRoutes.list(),
        icon: <MapIcon />,
      },
      {
        value: TillRoutes.action("list"),
        label: t("till.configuration"),
        to: TillRoutes.action("list"),
        icon: <PointOfSaleIcon />,
      },
      {
        value: TillProfileRoutes.list(),
        label: t("profile.profiles"),
        to: TillProfileRoutes.list(),
        icon: <FolderIcon />,
      },
      {
        value: TillLayoutRoutes.list(),
        label: t("layout.layouts"),
        to: TillLayoutRoutes.list(),
        icon: <FolderIcon />,
      },
      {
        value: TillButtonsRoutes.list(),
        label: t("button.buttons"),
        to: TillButtonsRoutes.list(),
        icon: <GamepadIcon />,
      },
      {
        value: CashRegistersRoutes.list(),
        label: t("register.registers"),
        to: CashRegistersRoutes.list(),
      },
      {
        value: TillStockingsRoutes.list(),
        label: t("register.stockings"),
        to: TillStockingsRoutes.list(),
      },
    ],
    [t]
  );

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} ariaLabel="Tills" />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
