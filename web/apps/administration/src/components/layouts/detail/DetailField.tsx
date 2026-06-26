import { Help as HelpIcon } from "@mui/icons-material";
import { ListItem, ListItemProps, ListItemText, Typography, Tooltip, Box } from "@mui/material";
import * as React from "react";

import { ListItemLink } from "@/components";

export type DetailFieldProps = {
  label: string;
  helpText?: string;
  value?: React.ReactNode;
  secondaryAction?: ListItemProps["secondaryAction"];
  linkTo?: string;
};

export const DetailField: React.FC<DetailFieldProps> = ({ label, helpText, value, secondaryAction, linkTo }) => {
  const primaryContent = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography component="span">{label}</Typography>
      {helpText && (
        <Tooltip title={helpText}>
          <HelpIcon
            fontSize="small"
            color="primary"
            sx={{ verticalAlign: "middle", cursor: "pointer" }}
            aria-label="help"
            tabIndex={-1}
          />
        </Tooltip>
      )}
    </Box>
  );

  const content = <ListItemText primary={primaryContent} secondary={value} />;
  if (linkTo !== undefined) {
    return <ListItemLink to={linkTo}>{content}</ListItemLink>;
  }
  return <ListItem secondaryAction={secondaryAction}>{content}</ListItem>;
};
