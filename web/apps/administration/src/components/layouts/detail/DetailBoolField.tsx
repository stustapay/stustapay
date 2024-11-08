import { Checkbox, ListItem, ListItemText } from "@mui/material";
import * as React from "react";

export type DetailBoolFieldProps = {
  label: string;
  value: boolean;
};

export const DetailBoolField: React.FC<DetailBoolFieldProps> = ({ label, value }) => {
  return (
    <ListItem secondaryAction={<Checkbox edge="end" checked={value} disabled={true} />}>
      <ListItemText primary={label} />
    </ListItem>
  );
};
