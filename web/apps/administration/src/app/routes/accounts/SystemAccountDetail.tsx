import * as React from "react";
import { useTranslation } from "react-i18next";

import { Account } from "@/api";
import { SystemAccountRoutes } from "@/app/routes";
import { DetailDateField, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";

export const SystemAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();

  return (
    <DetailLayout title={account.name ?? ""} routes={SystemAccountRoutes}>
      <DetailView>
        <DetailField label={t("account.id")} value={account.id} />
        <DetailField label={t("account.type")} value={account.type} />
        <DetailField label={t("account.name")} value={account.name} />
        <DetailField label={t("account.comment")} value={account.comment} />
        <DetailDateField label={t("account.activatedAt")} value={account.activated_at} />
        <DetailNumberField label={t("account.balance")} type="currency" value={account.balance} />
        <DetailField label={t("account.vouchers")} value={account.vouchers} />
      </DetailView>
    </DetailLayout>
  );
};
