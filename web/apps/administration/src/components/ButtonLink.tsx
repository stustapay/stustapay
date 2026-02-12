import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, ButtonProps } from "@mui/material";

type ButtonLinkProps = {
  to: string;
} & Omit<ButtonProps, "onClick">;

export const ButtonLink: React.FC<ButtonLinkProps> = ({ to, children, ...props }) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Button component={RouterLink as any} to={to} {...props}>
      {children}
    </Button>
  );
};
