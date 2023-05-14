import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  ListItem,
  ListItemText,
  InputAdornment,
} from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { useTranslation } from "react-i18next";
import { Account } from "@stustapay/models";
import { useCurrencyFormatter, useCurrencySymbol } from "@hooks";
import { useUpdateBalanceMutation } from "@api";
import { toast } from "react-toastify";

export interface EditAccountBalanceModalProps {
  account: Account;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountBalanceModal: React.FC<EditAccountBalanceModalProps> = ({ account, open, handleClose }) => {
  const { t } = useTranslation();

  const formatCurrency = useCurrencyFormatter();
  const currencySymbol = useCurrencySymbol();
  const [updateBalance] = useUpdateBalanceMutation();

  const [balance, setBalance] = React.useState(account.balance);

  React.useEffect(() => {
    setBalance(account.balance);
  }, [account]);

  const handleConfirm = () => {
    updateBalance({ accountId: account.id, newBalance: balance })
      .unwrap()
      .then(() => {
        handleClose();
      })
      .catch(() => {
        toast.error(`updating balance failed`);
      });
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
          onChange={setBalance}
          label={t("account.newBalance")}
          InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
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
