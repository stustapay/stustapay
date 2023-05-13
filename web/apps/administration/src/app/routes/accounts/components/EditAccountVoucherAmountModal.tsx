import * as React from "react";
import { Dialog, DialogTitle, DialogContent, Button, DialogActions, ListItem, ListItemText } from "@mui/material";
import { NumericInput } from "@components";
import { useTranslation } from "react-i18next";
import { Account } from "@stustapay/models";
import { useUpdateVoucherAmountMutation } from "@api";
import { toast } from "react-toastify";

export interface EditAccountVoucherAmountModalProps {
  account: Account;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountVoucherAmountModal: React.FC<EditAccountVoucherAmountModalProps> = ({
  account,
  open,
  handleClose,
}) => {
  const { t } = useTranslation();

  const [updateVoucherAmount] = useUpdateVoucherAmountMutation();

  const [voucherAmount, setVoucherAmount] = React.useState(account.vouchers);

  React.useEffect(() => {
    setVoucherAmount(account.vouchers);
  }, [account]);

  const handleConfirm = () => {
    updateVoucherAmount({ accountId: account.id, newVoucherAmount: voucherAmount })
      .unwrap()
      .then(() => {
        handleClose();
      })
      .catch(() => {
        toast.error(`updating voucher amount failed`);
      });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t("account.changeVoucherAmount")}</DialogTitle>
      <DialogContent>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText primary={t("account.oldVoucherAmount")} secondary={account.vouchers} />
        </ListItem>
        <NumericInput
          value={voucherAmount}
          fullWidth
          onChange={setVoucherAmount}
          label={t("account.newVoucherAmount")}
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
