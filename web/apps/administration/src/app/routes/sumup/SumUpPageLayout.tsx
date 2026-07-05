import { Box } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";

import { useNode } from "@/api/nodes";
import { SumUpCheckoutRoutes, SumUpTransactionRoutes } from "@/app/routes";
import { ResponsivePageTabs } from "@/components";

export const SumUpPageLayout: React.FC = () => {
  const { t } = useTranslation();
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });

  const tabs = React.useMemo(
    () => [
      {
        value: SumUpTransactionRoutes.list(),
        label: t("sumup.transactions"),
        to: SumUpTransactionRoutes.list(),
      },
      {
        value: SumUpCheckoutRoutes.list(),
        label: t("sumup.checkouts"),
        to: SumUpCheckoutRoutes.list(),
      },
    ],
    [t]
  );

  if (!nodeId) {
    // TODO: return error page / redirect
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box>
      <ResponsivePageTabs tabs={tabs} />
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
