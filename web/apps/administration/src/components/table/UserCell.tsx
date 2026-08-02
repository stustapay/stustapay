import { Link } from "@mui/material";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";

import { UserRoutes } from "@/app/routes";
import { User } from "@/db/api/generated";

export const userValueGetter = (user: User | undefined | null) => {
  if (user?.login == null) {
    return "";
  }

  return getUserName({ login: user.login, display_name: user.display_name ?? "" });
};

export const UserCell: React.FC<{
  user: User | undefined | null;
  nodeId?: number;
}> = ({ user, nodeId }) => {
  if (user?.id == null || user.login == null) {
    return null;
  }

  return (
    <Link component={RouterLink} to={UserRoutes.detail(user.id, user.node_id ?? nodeId)}>
      {getUserName({ login: user.login, display_name: user.display_name ?? "" })}
    </Link>
  );
};
