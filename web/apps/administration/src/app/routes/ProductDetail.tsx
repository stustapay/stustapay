import { Card, CircularProgress, Typography } from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import { useGetProductByIdQuery } from "../../api";

export const ProductDetail: React.FC = () => {
  const { productId } = useParams();
  const { data, error, isLoading } = useGetProductByIdQuery(productId as unknown as number);

  return (
    <Card>
      {isLoading ? (
        <CircularProgress />
      ) : (
        <Typography>
          {data?.name} - {data?.price}€
        </Typography>
      )}
    </Card>
  );
};
