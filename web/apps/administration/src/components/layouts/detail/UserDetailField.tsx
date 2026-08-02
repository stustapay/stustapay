import { ListItemProps } from "@mui/material";
import { getUserName } from "@stustapay/models";
import * as React from "react";

import { UserRoutes } from "@/app/routes";

import { DetailField } from "./DetailField";

export type UserDetailFieldProps = {
  label: string;
  user?: { id?: number; login?: string; display_name?: string; node_id?: number } | null;
  fallbackNodeId: number;
  helpText?: string;
  secondaryAction?: ListItemProps["secondaryAction"];
};

export const UserDetailField: React.FC<UserDetailFieldProps> = ({
  label,
  user,
  fallbackNodeId,
  helpText,
  secondaryAction,
}) => {
  if (user?.id == null || user.login == null) {
    return <DetailField label={label} helpText={helpText} secondaryAction={secondaryAction} />;
  }

  return (
    <DetailField
      label={label}
      helpText={helpText}
      secondaryAction={secondaryAction}
      linkTo={UserRoutes.detail(user.id, user.node_id ?? fallbackNodeId)}
      value={getUserName({ login: user.login, display_name: user.display_name ?? "" })}
    />
  );
};
