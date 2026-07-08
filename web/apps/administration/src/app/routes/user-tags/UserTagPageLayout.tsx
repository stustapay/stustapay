import { Box } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { withTreeObjectGuard } from "@/app/layout";
import { UserTagRoutes, UserTagVariantRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const UserTagPageLayout: React.FC = withTreeObjectGuard("user_tag", () => {
  const { t } = useTranslation();

  const tabs = React.useMemo(
    () => [
      {
        value: UserTagRoutes.list(),
        label: t("userTag.find"),
        to: UserTagRoutes.list(),
      },
      {
        value: UserTagRoutes.action("create-tags"),
        label: t("userTag.createButton"),
        to: UserTagRoutes.action("create-tags"),
      },
      {
        value: UserTagVariantRoutes.list(),
        label: t("userTagVariant.tab"),
        to: UserTagVariantRoutes.list(),
      },
      {
        value: UserTagRoutes.action("create-secret"),
        label: t("userTagSecret.createButton"),
        to: UserTagRoutes.action("create-secret"),
      },
    ],
    [t]
  );

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} ariaLabel="User Tags" />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
});
