import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, ButtonProps } from "@mui/material";

type ButtonLinkProps = {
  to: string;
} & Omit<ButtonProps, "onClick">;

export const ButtonLink: React.FC<ButtonLinkProps> = ({ to, children, ...props }) => {
  return (
    <Button component={RouterLink as any} to={to} {...props}>
      {children}
    </Button>
  );
};
