import * as React from "react";
import { ListItemButton, ListItemText, ListItemIcon, Collapse } from "@mui/material";
import { ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

export interface ExpandableLinkMenuProps {
  label: string;
  children: React.ReactNode;
}

export const ExpandableLinkMenu: React.FC<ExpandableLinkMenuProps> = ({ label, children }) => {
  const [open, setOpen] = React.useState(false);

  const toggleOpen = () => setOpen((open) => !open);
  return (
    <>
      <ListItemButton onClick={toggleOpen}>
        <ListItemIcon>{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</ListItemIcon>
        <ListItemText primary={label} />
      </ListItemButton>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
};
