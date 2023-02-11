import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type ConfirmDialogCloseHandler = (reason: "confirm" | "abort") => void;

export interface ConfirmDialogProps {
  title: string;
  show: boolean;
  body: React.ReactNode;
  onClose: ConfirmDialogCloseHandler;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, body, show, onClose }) => {
  const { t } = useTranslation(["common"]);

  const handleAbort = () => {
    onClose("abort");
  };

  const handleConfirm = () => {
    onClose("confirm");
  };

  return (
    <Dialog open={show}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <Button onClick={handleAbort} color="error">
          {t("cancel")}
        </Button>
        <Button onClick={handleConfirm} color="primary">
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
