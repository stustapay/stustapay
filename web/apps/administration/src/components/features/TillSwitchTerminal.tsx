import { Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Loading, Select } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useSwitchTerminalMutation } from "@/api";
import { Terminal } from "@/db/api/generated";
import { getTerminalCollection, refetchTillTerminalCollections } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type TillSwitchTerminalProps = {
  tillId: number;
  open: boolean;
  onClose: () => void;
};

export const TillSwitchTerminal: React.FC<TillSwitchTerminalProps> = ({ tillId, open, onClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: terminals, isLoading } = useLiveQuery(
    (q) => q.from({ terminals: getTerminalCollection(currentNode.id) }),
    [currentNode.id]
  );
  const [selectedTerminal, setSelectedTerminal] = React.useState<Terminal | null>(null);
  const [switchTerminal] = useSwitchTerminalMutation();

  const freeTerminals = terminals?.filter((terminal) => terminal.till_id == null) ?? [];

  if (isLoading || !terminals) {
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
    }).then(() => refetchTillTerminalCollections(currentNode.id).then(onClose));
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
          options={freeTerminals}
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
