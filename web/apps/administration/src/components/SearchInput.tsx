import * as React from "react";
import { Search as SearchIcon } from "@mui/icons-material";
import { InputAdornment, TextField, TextFieldProps } from "@mui/material";

export type SearchInputProps = TextFieldProps;

export const SearchInput: React.FC<SearchInputProps> = ({ slotProps, ...props }) => {
  const actualSlotProps = {
    ...slotProps,
    input: {
      ...slotProps?.input,
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon />
        </InputAdornment>
      ),
    },
  };

  return <TextField variant="outlined" placeholder="Search ..." {...props} slotProps={actualSlotProps} />;
};
