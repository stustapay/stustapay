import { selectProductAll, useListProductsQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
} from "@mui/material";
import * as React from "react";

export interface ProductSelectProps extends Omit<SelectProps, "value" | "onChange" | "margin"> {
  label: string;
  value: number | null;
  helperText?: string;
  margin?: SelectProps["margin"] | "normal";
  onChange: (id: number) => void;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  margin,
  ...props
}) => {
  const { currentNode } = useCurrentNode();
  const { products } = useListProductsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectProductAll(data) : [],
      }),
    }
  );

  const handleChange = (evt: SelectChangeEvent<unknown>) => {
    if (!isNaN(Number(evt.target.value))) {
      onChange(Number(evt.target.value));
    }
  };

  return (
    <FormControl fullWidth margin={margin} error={error}>
      <InputLabel variant={props.variant} id="productSelectLabel">
        {label}
      </InputLabel>
      <Select labelId="productSelectLabel" value={value === null ? "" : value} onChange={handleChange} {...props}>
        {products.map((product) => (
          <MenuItem key={product.id} value={product.id}>
            {product.name} ({product.price}€)
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
