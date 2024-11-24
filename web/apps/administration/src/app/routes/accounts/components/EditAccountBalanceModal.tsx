import { Account, useUpdateBalanceMutation } from "@/api";
import { useCurrencyFormatter, useCurrencySymbol, useCurrentNode } from "@/hooks";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  ListItem,
  ListItemText,
} from "@mui/material";
import { NumericInput } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export interface EditAccountBalanceModalProps {
  account: Account;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountBalanceModal: React.FC<EditAccountBalanceModalProps> = ({ account, open, handleClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const formatCurrency = useCurrencyFormatter();
  const currencySymbol = useCurrencySymbol();
  const [updateBalance] = useUpdateBalanceMutation();

  const [balance, setBalance] = React.useState(account.balance);

  React.useEffect(() => {
    setBalance(account.balance);
  }, [account]);

  const handleConfirm = () => {
    updateBalance({ nodeId: currentNode.id, accountId: account.id, updateBalancePayload: { new_balance: balance } })
      .unwrap()
      .then(() => {
        handleClose();
      })
      .catch(() => {
        toast.error(`updating balance failed`);
      });
  };

  const handleChange = (newVal: number | null) => {
    if (newVal != null) {
      setBalance(newVal);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t("account.changeBalance")}</DialogTitle>
      <DialogContent>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText primary={t("account.oldBalance")} secondary={formatCurrency(account.balance)} />
        </ListItem>
        <NumericInput
          value={balance}
          fullWidth
          onChange={handleChange}
          label={t("account.newBalance")}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
