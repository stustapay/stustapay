import { Account, selectAccountAll, useFindAccountsMutation, useTransferBalanceMutation } from "@/api";
import { useCurrencyFormatter, useCurrencySymbol, useCurrentNode } from "@/hooks";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { NumericInput, Select } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export interface TransferAccountBalanceModalProps {
  sourceAccount: Account;
  open: boolean;
  handleClose: () => void;
}

export const TransferAccountBalanceModal: React.FC<TransferAccountBalanceModalProps> = ({
  sourceAccount,
  open,
  handleClose,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const formatCurrency = useCurrencyFormatter();
  const currencySymbol = useCurrencySymbol();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [targetAccount, setTargetAccount] = React.useState<Account | null>(null);
  const [targetAccounts, setTargetAccounts] = React.useState<Account[]>([]);

  const [findAccounts, { isLoading: isSearching }] = useFindAccountsMutation();
  const [transferAccountBalance, { isLoading: isSubmitting }] = useTransferBalanceMutation();

  React.useEffect(() => {
    if (open) {
      setSearchTerm("");
      setAmount(0);
      setTargetAccount(null);
      setTargetAccounts([]);
    }
  }, [open]);

  const formatAccount = (account: Account) => {
    const accountName = account.name == null || account.name === "" ? t("common.notSet") : account.name;
    return `#${account.id} ${accountName}`;
  };

  const handleSearch = () => {
    findAccounts({ nodeId: currentNode.id, findAccountPayload: { search_term: searchTerm } })
      .unwrap()
      .then((result) => {
        const accounts = (selectAccountAll(result) as Account[]).filter((acc) => acc.id !== sourceAccount.id);
        setTargetAccounts(accounts);
        if (targetAccount != null && !accounts.some((acc) => acc.id === targetAccount.id)) {
          setTargetAccount(null);
        }
      })
      .catch((err: any) => {
        toast.error(err?.data?.detail ?? t("account.transferError"));
      });
  };

  const handleConfirm = () => {
    if (targetAccount == null || amount <= 0) {
      return;
    }

    transferAccountBalance({
      nodeId: currentNode.id,
      transferBalancePayload: {
        source_account_id: sourceAccount.id,
        target_account_id: targetAccount.id,
        amount,
      },
    })
      .unwrap()
      .then(() => {
        toast.success(t("account.transferSuccess"));
        handleClose();
      })
      .catch((err: any) => {
        toast.error(err?.data?.detail ?? t("account.transferError"));
      });
  };

  const canSubmit = targetAccount != null && amount > 0 && amount <= sourceAccount.balance && !isSubmitting;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("account.transferBalance")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            {t("account.transferSource", { accountId: sourceAccount.id, balance: formatCurrency(sourceAccount.balance) })}
          </Typography>

          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              variant="standard"
              label={t("account.searchTerm")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {t("account.search")}
            </Button>
          </Stack>

          <Select<Account, false>
            multiple={false}
            label={t("account.targetAccount")}
            options={targetAccounts}
            value={targetAccount}
            onChange={setTargetAccount}
            formatOption={formatAccount}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          <NumericInput
            label={t("account.transferAmount")}
            value={amount}
            onChange={(newValue) => setAmount(newValue ?? 0)}
            fullWidth
            slotProps={{ input: { endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> } }}
          />

          <Typography variant="caption" color={amount > sourceAccount.balance ? "error" : "text.secondary"}>
            {t("account.transferAmountMax", { amount: formatCurrency(sourceAccount.balance) })}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("cancel")}</Button>
        <Button onClick={handleConfirm} disabled={!canSubmit}>
          {t("account.transferBalance")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
