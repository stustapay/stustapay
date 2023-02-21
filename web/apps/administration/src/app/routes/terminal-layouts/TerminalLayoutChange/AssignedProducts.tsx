import * as React from "react";
import { List, Typography } from "@mui/material";
import { useGetProductsQuery } from "@api";
import { Loading } from "@components/Loading";
import { useTranslation } from "react-i18next";
import { DraggableProduct } from "./DraggableProduct";
import { DragArea } from "./DragArea";
import { Product } from "@models";

export interface AssignedProductsProps {
  assignedProductIds: number[];
  setAssignedProductIds: (productIds: number[]) => void;
}

export const AssignedProducts: React.FC<AssignedProductsProps> = ({ assignedProductIds, setAssignedProductIds }) => {
  const { t } = useTranslation(["terminals", "common"]);
  const { data: allProducts, isLoading } = useGetProductsQuery();
  const products = allProducts
    ? assignedProductIds.map((id) => allProducts.find((product) => product.id === id) as Product)
    : [];

  const moveProduct = (productId: number, hoveredProductId: number, hoveredBelow: boolean) => {
    const addMode = hoveredBelow ? 1 : 0;
    // first check if the product would move at all
    const oldHoveredIndex = assignedProductIds.findIndex((id) => id === hoveredProductId);
    const oldIndex = assignedProductIds.findIndex((id) => id === productId);
    if (oldIndex === oldHoveredIndex + addMode) {
      return;
    }
    const newProducts = [...assignedProductIds.filter((id) => id !== productId)];
    const hoveredIndex = newProducts.findIndex((id) => id === hoveredProductId);
    newProducts.splice(hoveredIndex + addMode, 0, productId);
    setAssignedProductIds(newProducts);
  };

  if (isLoading || !allProducts) {
    // TODO handle error case
    return <Loading />;
  }
  if (assignedProductIds.length === 0) {
    const moveProductEmpty = (productId: number) => {
      setAssignedProductIds([productId]);
    };
    return (
      <Typography variant="h5">
        {t("assignedProducts")}
        <DragArea moveProduct={moveProductEmpty} />
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h5">{t("assignedProducts")}</Typography>
      <List>
        {products.map((product) => (
          <DraggableProduct key={product.id} product={product} moveProduct={moveProduct} />
        ))}
      </List>
    </>
  );
};
