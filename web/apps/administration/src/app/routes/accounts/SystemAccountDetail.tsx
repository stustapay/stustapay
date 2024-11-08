import { Account } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrencyFormatter } from "@/hooks";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const SystemAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();

  return (
    <DetailLayout title={account.name ?? ""} routes={AccountRoutes}>
      <DetailView>
        <DetailField label={t("account.id")} value={account.id} />
        <DetailField label={t("account.type")} value={account.type} />
        <DetailField label={t("account.name")} value={account.name} />
        <DetailField label={t("account.comment")} value={account.comment} />
        <DetailField label={t("account.balance")} value={formatCurrency(account.balance)} />
        <DetailField label={t("account.vouchers")} value={account.vouchers} />
      </DetailView>
    </DetailLayout>
  );
};
