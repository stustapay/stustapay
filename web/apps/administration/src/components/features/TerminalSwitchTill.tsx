import { Till, selectTillAll, useListTillsQuery, useSwitchTillMutation } from "@/api";
import { Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Loading, Select } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type TerminalSwitchTillProps = {
  terminalId: number;
  nodeId: number;
  open: boolean;
  onClose: () => void;
};

export const TerminalSwitchTill: React.FC<TerminalSwitchTillProps> = ({ terminalId, nodeId, open, onClose }) => {
  const { t } = useTranslation();
  const { tills } = useListTillsQuery(
    { nodeId },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tills: data ? selectTillAll(data).filter((till) => till.node_id === nodeId && till.terminal_id == null) : [],
      }),
    }
  );
  const [selectedTill, setSelectedTill] = React.useState<Till | null>(null);
  const [switchTill] = useSwitchTillMutation();

  if (!tills) {
    return <Loading />;
  }

  const handleConfirm = () => {
    if (!selectedTill) {
      return;
    }
    switchTill({ nodeId, terminalId, switchTillPayload: { new_till_id: selectedTill.id } }).then(() => onClose());
  };

  return (
    <Dialog open={open}>
      <DialogTitle>{t("terminal.switchTill")}</DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <Typography>{t("terminal.switchTillDescription")}</Typography>
        <Select
          multiple={false}
          formatOption={(till: Till) => till.name}
          value={selectedTill}
          options={tills}
          label={t("till.till")}
          onChange={setSelectedTill}
        />
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={selectedTill == null}>
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
