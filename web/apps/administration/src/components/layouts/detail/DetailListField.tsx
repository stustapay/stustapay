import { DetailField } from "@/components";
import { Chip } from "@mui/material";
import * as React from "react";

export type DetailListFieldProps = {
  label: string;
  value?: string[];
  variant?: "chips";
};

export const DetailListField: React.FC<DetailListFieldProps> = ({ label, value }) => {
  return (
    <DetailField
      label={label}
      value={value?.map((item) => <Chip key={item} variant="outlined" label={item} sx={{ mr: 1 }} />)}
    />
  );
};
