import { FormControl, ListItemIcon, ListItemText, MenuItem, Select, Stack } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import * as React from "react";

export interface TabOption {
  value: string;
  label: string;
  icon?: React.ReactElement;
}

export interface ResponsiveTabSelectProps {
  value: string;
  options: TabOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}

const renderTabValue = (option: TabOption) => (
  <Stack direction="row" spacing={0} sx={{ alignItems: "center" }}>
    {option.icon && <ListItemIcon sx={{ minWidth: 36 }}>{option.icon}</ListItemIcon>}
    <span>{option.label}</span>
  </Stack>
);

export const ResponsiveTabSelect: React.FC<ResponsiveTabSelectProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  sx,
}) => {
  return (
    <FormControl fullWidth sx={{ mb: 2, ...sx }}>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        renderValue={(selected) => {
          const option = options.find((item) => item.value === selected);
          return option ? renderTabValue(option) : selected;
        }}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.icon ? (
              <>
                <ListItemIcon sx={{ minWidth: 36 }}>{option.icon}</ListItemIcon>
                <ListItemText>{option.label}</ListItemText>
              </>
            ) : (
              option.label
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
