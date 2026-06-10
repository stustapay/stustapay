import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Loading, Select } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import {
  MdmDeviceWithMapping,
  Terminal,
  selectTerminalAll,
  useChangeMdmDeviceMappingMutation,
  useListTerminalsQuery,
} from "@/api";
import { useCurrentNode } from "@/hooks";

export type MdmDeviceChangeMappingProps = {
  device: MdmDeviceWithMapping;
  mappedTerminalIds: Set<number>;
  open: boolean;
  onClose: () => void;
};

const getSelectableTerminals = (terminals: Terminal[], device: MdmDeviceWithMapping, mappedTerminalIds: Set<number>) =>
  terminals.filter((terminal) => !mappedTerminalIds.has(terminal.id) || terminal.id === device.mapping?.terminal_id);

const getDefaultTerminal = (
  terminals: Terminal[],
  device: MdmDeviceWithMapping,
  mappedTerminalIds: Set<number>
): Terminal | null => {
  if (device.mapping) {
    const currentTerminal = terminals.find((terminal) => terminal.id === device.mapping?.terminal_id);
    if (currentTerminal) {
      return currentTerminal;
    }
  }

  return (
    terminals.find(
      (terminal) =>
        !mappedTerminalIds.has(terminal.id) && terminal.name.toLowerCase() === device.device.device_id.toLowerCase()
    ) ?? null
  );
};

export const MdmDeviceChangeMapping: React.FC<MdmDeviceChangeMappingProps> = ({
  device,
  mappedTerminalIds,
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { terminals, isLoading } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data) : undefined,
      }),
    }
  );
  const [changeMapping] = useChangeMdmDeviceMappingMutation();
  const [selectedTerminal, setSelectedTerminal] = React.useState<Terminal | null>(null);

  const selectableTerminals = React.useMemo(
    () => (terminals ? getSelectableTerminals(terminals, device, mappedTerminalIds) : []),
    [terminals, device, mappedTerminalIds]
  );

  React.useEffect(() => {
    if (!open || !terminals) {
      return;
    }
    setSelectedTerminal(getDefaultTerminal(terminals, device, mappedTerminalIds));
  }, [open, terminals, device, mappedTerminalIds]);

  const handleConfirm = () => {
    if (!selectedTerminal) {
      return;
    }

    changeMapping({
      nodeId: currentNode.id,
      changeMdmDeviceMappingPayload: {
        mdm_device_id: device.device.device_id,
        terminal_id: selectedTerminal.id,
      },
    })
      .unwrap()
      .then(() => {
        toast.success(t("terminal.mdm.changeMappingSuccess"));
        onClose();
      })
      .catch(() => {
        toast.error(t("terminal.mdm.changeMappingFailed"));
      });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t("terminal.mdm.changeMappingTitle")}</DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        {isLoading || !terminals ? (
          <Loading />
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>{t("terminal.mdm.changeMappingDescription")}</Typography>
            <Typography sx={{ mb: 2 }}>
              {t("terminal.mdm.deviceId")}: {device.device.device_id}
            </Typography>
            <Select
              multiple={false}
              formatOption={(terminal: Terminal) => terminal.name}
              value={selectedTerminal}
              options={selectableTerminals}
              label={t("terminal.terminals")}
              onChange={setSelectedTerminal}
            />
          </>
        )}
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
