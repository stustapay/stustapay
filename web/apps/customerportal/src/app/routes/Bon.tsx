import { useGetBonQuery } from "@/api";
import { Alert } from "@mui/material";
import { BonDisplay, Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export const Bon: React.FC = () => {
  const { orderUUID } = useParams();
  const { t } = useTranslation();

  const { data: bon, isLoading, isError } = useGetBonQuery({ orderUuid: orderUUID! });

  if (!isError && !bon) {
    return <Loading />;
  }

  if (!bon) {
    return <Alert severity="error">{t("errorLoadingBon")}</Alert>;
  }

  return <BonDisplay bon={bon} />;
};
