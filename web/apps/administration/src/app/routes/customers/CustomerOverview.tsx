import { withPrivilegeGuard } from "@/app/layout";
import { Box } from "@mui/material";
import { Privilege } from "@stustapay/models";

export const CustomerOverview = withPrivilegeGuard(Privilege.node_administration, () => {
  return <Box>Overview</Box>;
});
