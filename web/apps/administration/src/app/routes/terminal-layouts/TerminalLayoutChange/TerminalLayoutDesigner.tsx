import * as React from "react";
import { Grid } from "@mui/material";
import { AvailableProducts } from "./AvailableProducts";
import { AssignedProducts } from "./AssignedProducts";
import { TerminalLayoutProducts } from "@models";

export interface TerminalLayoutDesignerProps {
  products: TerminalLayoutProducts;
  onChange: (products: TerminalLayoutProducts) => void;
}

export const TerminalLayoutDesigner: React.FC<TerminalLayoutDesignerProps> = ({ products, onChange }) => {
  const assignedProductIds = [...products]
    .sort((a, b) => a.sequence_number - b.sequence_number)
    .map((p) => p.product_id);

  const setAssignedProductIds = React.useCallback(
    (productIds: number[]) => {
      const newProductIds = productIds.map((id, index) => ({ product_id: id, sequence_number: index }));
      onChange(newProductIds);
    },
    [onChange]
  );

  return (
    <Grid container sx={{ padding: 2 }}>
      <Grid item xs={6}>
        <AvailableProducts assignedProductIds={assignedProductIds} setAssignedProductIds={setAssignedProductIds} />
      </Grid>
      <Grid item xs={6}>
        <AssignedProducts assignedProductIds={assignedProductIds} setAssignedProductIds={setAssignedProductIds} />
      </Grid>
    </Grid>
  );
};
