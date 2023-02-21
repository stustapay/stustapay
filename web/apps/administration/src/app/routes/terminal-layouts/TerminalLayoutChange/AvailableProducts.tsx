import * as React from "react";
import { List, Typography } from "@mui/material";
import { useGetProductsQuery } from "@api";
import { Loading } from "@components/Loading";
import { useTranslation } from "react-i18next";
import { DraggableProduct } from "./DraggableProduct";
import { DragArea } from "./DragArea";

export interface AvailableProductsProps {
  assignedProductIds: number[];
  setAssignedProductIds: (productIds: number[]) => void;
}

export const AvailableProducts: React.FC<AvailableProductsProps> = ({ assignedProductIds, setAssignedProductIds }) => {
  const { t } = useTranslation(["terminals", "common"]);
  const { data: allProducts, isLoading } = useGetProductsQuery();
  const products = (allProducts ?? [])
    .filter((product) => !assignedProductIds.includes(product.id))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const moveProduct = (productId: number) => {
    setAssignedProductIds(assignedProductIds.filter((id) => id !== productId));
  };

  if (isLoading || !allProducts) {
    // TODO handle error case
    return <Loading />;
  }

  if (products.length === 0) {
    const moveProductEmpty = (productId: number) => {
      setAssignedProductIds(assignedProductIds.filter((id) => id !== productId));
    };
    return (
      <Typography variant="h5">
        {t("availableProducts")}
        <DragArea moveProduct={moveProductEmpty} />
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h5">{t("availableProducts")}</Typography>
      <List>
        {products.map((product) => (
          <DraggableProduct key={product.id} product={product} moveProduct={moveProduct} />
        ))}
      </List>
    </>
  );
};
