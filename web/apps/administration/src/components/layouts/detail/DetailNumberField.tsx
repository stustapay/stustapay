import { ListItem, ListItemProps, ListItemText } from "@mui/material";
import * as React from "react";
import { useCurrencyFormatter } from "@/hooks";

export type DetailNumberFieldProps = {
  label: string;
  value?: number | null;
  type?: "currency";
  secondaryAction?: ListItemProps["secondaryAction"];
};

export const DetailNumberField: React.FC<DetailNumberFieldProps> = ({ label, value, type, secondaryAction }) => {
  const formatCurrency = useCurrencyFormatter();

  const actualValue = type === "currency" ? formatCurrency(value) : value;

  return (
    <ListItem secondaryAction={secondaryAction}>
      <ListItemText primary={label} secondary={actualValue} />
    </ListItem>
  );
};
