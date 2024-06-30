import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { IconButton, IconButtonProps } from "@mui/material";

type IconButtonLinkProps = {
  to: string;
} & Omit<IconButtonProps, "onClick">;

export const IconButtonLink: React.FC<IconButtonLinkProps> = ({ to, children, ...props }) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<IconButton component={RouterLink as any} to={to} {...props}>
      {children}
    </IconButton>)
  );
};
