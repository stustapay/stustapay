import * as React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItem, ListItemText } from "@mui/material";
import { NumericInput } from "@stustapay/components";
import { useTranslation } from "react-i18next";
import { Account, useUpdateVoucherAmountMutation } from "@api";
import { toast } from "react-toastify";
import { useCurrentNode } from "@hooks";

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
  const { currentNode } = useCurrentNode();

  const [updateVoucherAmount] = useUpdateVoucherAmountMutation();

  const [voucherAmount, setVoucherAmount] = React.useState(account.vouchers);

  React.useEffect(() => {
    setVoucherAmount(account.vouchers);
  }, [account]);

  const handleConfirm = () => {
    updateVoucherAmount({
      nodeId: currentNode.id,
      accountId: account.id,
      updateVoucherAmountPayload: { new_voucher_amount: voucherAmount },
    })
      .unwrap()
      .then(() => {
        handleClose();
      })
      .catch(() => {
        toast.error(`updating voucher amount failed`);
      });
  };

  const handleChange = (newVal: number | null) => {
    if (newVal != null) {
      setVoucherAmount(newVal);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t("account.changeVoucherAmount")}</DialogTitle>
      <DialogContent>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText primary={t("account.oldVoucherAmount")} secondary={account.vouchers} />
        </ListItem>
        <NumericInput value={voucherAmount} fullWidth onChange={handleChange} label={t("account.newVoucherAmount")} />
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
