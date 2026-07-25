import { Link } from "@mui/material";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";

import { UserTagRoutes } from "@/app/routes";

export type UserTagLike = {
  user_tag_id?: number | null;
  user_tag_uid_hex?: string | null;
};

export const userTagValueGetter = (userTag: UserTagLike | undefined | null) => {
  return formatUserTagUid(userTag?.user_tag_uid_hex);
};

export const UserTagCell: React.FC<{
  userTag: UserTagLike | undefined | null;
  nodeId?: number;
}> = ({ userTag, nodeId }) => {
  if (userTag?.user_tag_id == null) {
    return null;
  }

  return (
    <Link component={RouterLink} to={UserTagRoutes.detail(userTag.user_tag_id, nodeId)}>
      {formatUserTagUid(userTag.user_tag_uid_hex)}
    </Link>
  );
};
