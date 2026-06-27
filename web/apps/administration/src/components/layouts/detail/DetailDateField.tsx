import { formatDate } from "@stustapay/utils";
import * as React from "react";

import { DetailField, DetailFieldProps } from "./DetailField";

export type DetailDateFieldProps = Omit<DetailFieldProps, "value"> & {
  value?: string | null;
};

export const DetailDateField: React.FC<DetailDateFieldProps> = ({ value, ...props }) => {
  const formattedValue = value ? formatDate(value) : undefined;

  return <DetailField {...props} value={formattedValue} />;
};
