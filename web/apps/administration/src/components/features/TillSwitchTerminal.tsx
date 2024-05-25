import { Terminal, selectTerminalAll, useListTerminalsQuery, useSwitchTerminalMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Loading, Select } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type TillSwitchTerminalProps = {
  tillId: number;
  open: boolean;
  onClose: () => void;
};

export const TillSwitchTerminal: React.FC<TillSwitchTerminalProps> = ({ tillId, open, onClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { terminals } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data).filter((t) => t.till_id == null) : [],
      }),
    }
  );
  const [selectedTerminal, setSelectedTerminal] = React.useState<Terminal | null>(null);
  const [switchTerminal] = useSwitchTerminalMutation();

  if (!terminals) {
    return <Loading />;
  }

  const handleConfirm = () => {
    if (!selectedTerminal) {
      return;
    }
    switchTerminal({
      nodeId: currentNode.id,
      tillId,
      switchTerminalPayload: { new_terminal_id: selectedTerminal.id },
    }).then(onClose);
  };

  return (
    <Dialog open={open}>
      <DialogTitle>{t("till.switchTerminal")}</DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <Typography>{t("till.switchTerminalDescription")}</Typography>
        <Select
          multiple={false}
          formatOption={(terminal: Terminal) => terminal.name}
          value={selectedTerminal}
          options={terminals}
          label={t("till.terminal")}
          onChange={setSelectedTerminal}
        />
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={selectedTerminal == null}>
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
