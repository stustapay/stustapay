import { Card, CircularProgress, Typography } from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import { useGetCashierByIdQuery } from "../../../api";

export const CashierDetail: React.FC = () => {
  const { cashierId } = useParams();
  const { data, error, isLoading } = useGetCashierByIdQuery(cashierId as unknown as number);

  return <Card>{isLoading ? <CircularProgress /> : <Typography>{data?.name}</Typography>}</Card>;
};
