import { Account } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { LayoutAction } from "@/components/layouts/types";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TransferAccountBalanceModal } from "./components/TransferAccountBalanceModal";

export const SystemAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();
  const [transferModalOpen, setTransferModalOpen] = React.useState(false);
  const actions: LayoutAction[] = [
    { label: t("account.transferBalance"), onClick: () => setTransferModalOpen(true), icon: <SwapHorizIcon /> },
  ];

  return (
    <DetailLayout title={account.name ?? ""} routes={AccountRoutes} actions={actions}>
      <DetailView>
        <DetailField label={t("account.id")} value={account.id} />
        <DetailField label={t("account.type")} value={account.type} />
        <DetailField label={t("account.name")} value={account.name} />
        <DetailField label={t("account.comment")} value={account.comment} />
        <DetailNumberField label={t("account.balance")} type="currency" value={account.balance} />
        <DetailField label={t("account.vouchers")} value={account.vouchers} />
      </DetailView>
      <TransferAccountBalanceModal
        sourceAccount={account}
        open={transferModalOpen}
        handleClose={() => setTransferModalOpen(false)}
      />
    </DetailLayout>
  );
};
