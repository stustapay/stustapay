import { Tooltip } from "@mui/material";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { getTaxRateCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const TaxRateCell: React.FC<{ taxRateId: number }> = ({ taxRateId }) => {
  const { currentNode } = useCurrentNode();
  const { data: taxRate } = useLiveQuery(
    (q) =>
      q
        .from({ taxRates: getTaxRateCollection(currentNode.id) })
        .where(({ taxRates }) => eq(taxRates.id, taxRateId))
        .findOne(),
    [currentNode.id]
  );
  if (!taxRate) {
    return "";
  }
  return (
    <Tooltip title={taxRate.description}>
      <span>{(taxRate.rate * 100).toFixed(0)} %</span>
    </Tooltip>
  );
};
