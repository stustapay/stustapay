import { Card, CircularProgress, Typography } from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import { useGetPointOfSalesByIdQuery } from "../../../api";

export const PointOfSaleDetail: React.FC = () => {
  const { pointOfSaleId } = useParams();
  const { data, error, isLoading } = useGetPointOfSalesByIdQuery(pointOfSaleId as unknown as number);

  return <Card>{isLoading ? <CircularProgress /> : <Typography>{data?.name}</Typography>}</Card>;
};
