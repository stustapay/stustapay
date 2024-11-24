import { Order, Product, selectProductAll, useEditOrderMutation, useListProductsQuery } from "@/api";
import { OrderRoutes } from "@/app/routes";
import { useCurrencyFormatter, useCurrencySymbol, useCurrentNode } from "@/hooks";
import { Add as AddIcon, Delete as DeleteIcon, Remove as RemoveIcon } from "@mui/icons-material";
import {
  Button,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Loading, NumericInput } from "@stustapay/components";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

interface SelectedProduct {
  product: Product;
  quantity: number | null;
  price: number | null;
}

export interface LineItemEditProps {
  order: Order;
}

export const LineItemEdit: React.FC<LineItemEditProps> = ({ order }) => {
  const currencySymbol = useCurrencySymbol();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const [selectedProducts, setSelectedProducts] = React.useState<SelectedProduct[]>([]);
  const navigate = useNavigate();

  const { products } = useListProductsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        products: data ? selectProductAll(data) : undefined,
      }),
    }
  );
  const [editSale] = useEditOrderMutation();

  React.useEffect(() => {
    setSelectedProducts(
      order.line_items.map((li) => ({ product: li.product, quantity: li.quantity, price: li.product_price }))
    );
  }, [order]);

  if (!products) {
    return <Loading />;
  }

  const handleAddProduct = (product: Product) => {
    if (selectedProducts.find((bu) => product.id === bu.product.id) !== undefined) {
      setSelectedProducts(
        selectedProducts.map((bu) => {
          if (bu.product.id === product.id) {
            return {
              ...bu,
              quantity: (bu.quantity ?? 0) + 1,
            };
          }
          return bu;
        })
      );
      return;
    }
    if (product.fixed_price) {
      setSelectedProducts([...selectedProducts, { product, quantity: 1, price: null }]);
    } else {
      setSelectedProducts([...selectedProducts, { product, quantity: null, price: 0 }]);
    }
  };

  const handleSubstractProduct = (product: Product) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product.id === product.id
          ? {
              ...p,
              quantity: p.quantity !== null ? p.quantity - 1 : null,
            }
          : p
      )
    );
  };

  const handleDeleteProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter((b) => b.product.id !== productId));
  };

  const handleQuantityChange = (productId: number, value: number | null) => {
    setSelectedProducts(selectedProducts.map((p) => (p.product.id === productId ? { ...p, quantity: value } : p)));
  };

  const handlePriceChange = (productId: number, value: number | null) => {
    setSelectedProducts(selectedProducts.map((p) => (p.product.id === productId ? { ...p, price: value } : p)));
  };

  const totalPrice = selectedProducts.reduce((sum, p) => {
    if (p.product.price != null && p.quantity) {
      return sum + p.product.price * p.quantity;
    } else if (p.price != null) {
      return sum + p.price;
    }
    return sum;
  }, 0);

  const handleSave = () => {
    editSale({
      orderId: order.id,
      nodeId: currentNode.id,
      editSaleProducts: {
        uuid: uuidv4(),
        products: selectedProducts.map((p) => {
          if (p.product.fixed_price) {
            return { product_id: p.product.id, price: null, quantity: p.quantity };
          } else {
            return { product_id: p.product.id, price: p.price, quantity: null };
          }
        }),
        used_vouchers: null, // TODO: provide numeric input field for used vouchers
      },
    })
      .unwrap()
      .then(({ id }) => {
        toast.success("successfully updated order");
        navigate(OrderRoutes.detail(id));
      })
      .catch(() => undefined);
  };

  return (
    <Stack spacing={1}>
      <List sx={{ maxHeight: "250px", overflowY: "auto" }}>
        {products.map((product) => (
          <ListItemButton key={product.id} onClick={() => handleAddProduct(product)}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary={product.name} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Total Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedProducts.map((p) => (
              <TableRow key={p.product.id}>
                <TableCell>{p.product.name}</TableCell>
                <TableCell align="right">
                  {p.product.fixed_price ? (
                    formatCurrency(p.price ?? p.product.price)
                  ) : (
                    <NumericInput
                      slotProps={{
                        input: { endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> },
                      }}
                      onChange={(value) => handlePriceChange(p.product.id, value)}
                      value={p.price}
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  {p.product.fixed_price ? (
                    <NumericInput onChange={(value) => handleQuantityChange(p.product.id, value)} value={p.quantity} />
                  ) : (
                    "1"
                  )}
                </TableCell>
                <TableCell align="right">
                  {p.product.price != null && p.quantity != null
                    ? formatCurrency(p.product.price * p.quantity)
                    : formatCurrency(p.price)}
                </TableCell>
                <TableCell>
                  {p.product.fixed_price && (
                    <>
                      <IconButton color="error" onClick={() => handleSubstractProduct(p.product)}>
                        <RemoveIcon />
                      </IconButton>
                      <IconButton color="primary" onClick={() => handleAddProduct(p.product)}>
                        <AddIcon />
                      </IconButton>
                    </>
                  )}
                  <IconButton color="error" onClick={() => handleDeleteProduct(p.product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <Divider />
            <TableRow>
              <TableCell colSpan={3} />
              <TableCell align="right">{formatCurrency(totalPrice)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Button fullWidth color="primary" onClick={handleSave}>
        Save
      </Button>
    </Stack>
  );
};
