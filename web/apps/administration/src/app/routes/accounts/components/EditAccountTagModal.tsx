import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  ListItem,
  ListItemText,
  TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Account } from "@stustapay/models";
import { toast } from "react-toastify";
import { useUpdateTagUidMutation } from "@api";

export interface EditAccountTagModalProps {
  account: Account;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountTagModal: React.FC<EditAccountTagModalProps> = ({ account, open, handleClose }) => {
  const { t } = useTranslation(["accounts", "common"]);

  const [updateTagUid] = useUpdateTagUidMutation();

  const [tagUid, setTagUid] = React.useState(String(account.user_tag_uid));

  React.useEffect(() => {
    setTagUid(String(account.user_tag_uid));
  }, [account]);

  const handleConfirm = () => {
    updateTagUid({ accountId: account.id, newTagUid: tagUid })
      .unwrap()
      .then(() => {
        handleClose();
      })
      .catch(() => {
        toast.error(`updating tag uid failed`);
      });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t("account.changeTag")}</DialogTitle>
      <DialogContent>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText primary={t("account.oldTagUid")} secondary={account.user_tag_uid} />
        </ListItem>
        <TextField
          inputProps={{ pattern: "[1-9][0-9]*" }}
          value={tagUid}
          fullWidth
          onChange={(e) => setTagUid(e.target.value)}
          label={t("account.newTagUid")}
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
