import { useNode } from "@/api/nodes";
import { withPrivilegeGuard } from "@/app/layout";
import { Box } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { Outlet, useParams } from "react-router-dom";

export const DsfinvkPageLayout: React.FC = withPrivilegeGuard("node_administration", () => {
  const { nodeId } = useParams();
  const { node } = useNode({ nodeId: Number(nodeId) });

  if (!nodeId) {
    // TODO: return error page / redirect
    return null;
  }

  if (!node) {
    return <Loading />;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Outlet />
    </Box>
  );
});
