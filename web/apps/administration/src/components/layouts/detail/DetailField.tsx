import { ListItem, ListItemProps, ListItemText } from "@mui/material";
import * as React from "react";

import { ListItemLink } from "@/components";

export type DetailFieldProps = {
  label: string;
  value?: React.ReactNode;
  secondaryAction?: ListItemProps["secondaryAction"];
  linkTo?: string;
};

export const DetailField: React.FC<DetailFieldProps> = ({ label, value, secondaryAction, linkTo }) => {
  const content = <ListItemText primary={label} secondary={value} />;
  if (linkTo !== undefined) {
    return <ListItemLink to={linkTo}>{content}</ListItemLink>;
  }
  return <ListItem secondaryAction={secondaryAction}>{content}</ListItem>;
};
