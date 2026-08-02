import { Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Loading, Select } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useSwitchTillMutation } from "@/api";
import { Till } from "@/db/api/generated";
import { getTillCollection, refetchTillTerminalCollections } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type TerminalSwitchTillProps = {
  terminalId: number;
  open: boolean;
  onClose: () => void;
};

export const TerminalSwitchTill: React.FC<TerminalSwitchTillProps> = ({ terminalId, open, onClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: tills, isLoading } = useLiveQuery(
    (q) => q.from({ tills: getTillCollection(currentNode.id) }),
    [currentNode.id]
  );
  const [selectedTill, setSelectedTill] = React.useState<Till | null>(null);
  const [switchTill] = useSwitchTillMutation();

  const freeTills = tills?.filter((till) => till.terminal_id == null) ?? [];

  if (isLoading || !tills) {
    return <Loading />;
  }

  const handleConfirm = () => {
    if (!selectedTill) {
      return;
    }
    switchTill({
      nodeId: currentNode.id,
      terminalId,
      switchTillPayload: { new_till_id: selectedTill.id },
    }).then(() => refetchTillTerminalCollections(currentNode.id).then(onClose));
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
          options={freeTills}
          label={t("till.till")}
          onChange={setSelectedTill}
        />
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={selectedTill == null}>
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
